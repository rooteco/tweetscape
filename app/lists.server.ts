import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import {
  ApiResponseError,
  TwitterV2IncludesHelper,
  getTwitterClientForUser,
  toInfluencer,
  toList,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { getListsQuery } from '~/query.server';
import { log } from '~/utils.server';
import { revalidate } from '~/swr.server';

export const action: ActionFunction = async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'));
    const uid = session.get('uid') as string | undefined;
    invariant(uid, 'expected session uid');
    const context = `user (${uid}) lists`;
    const { api, limits } = await getTwitterClientForUser(uid);
    const listFollowedLimit = await limits.v2.getRateLimit(
      'users/:id/followed_lists'
    );
    if ((listFollowedLimit?.remaining ?? 1) > 0) {
      log.info(`Fetching followed lists for ${context}...`);
      const res = await api.v2.listFollowed(uid, {
        'list.fields': [
          'created_at',
          'follower_count',
          'member_count',
          'private',
          'description',
          'owner_id',
        ],
        'expansions': ['owner_id'],
        'user.fields': [
          'id',
          'name',
          'username',
          'profile_image_url',
          'public_metrics',
          'created_at',
        ],
      });
      const includes = new TwitterV2IncludesHelper(res);
      const owners = includes.users.map(toInfluencer);
      log.info(
        `Inserting ${owners.length} followed list owners for ${context}...`
      );
      await db.influencers.createMany({ data: owners, skipDuplicates: true });
      const lists = res.lists.map(toList);
      log.info(`Inserting ${lists.length} followed lists for ${context}...`);
      log.debug(
        `User (${uid}) followed lists: ${JSON.stringify(lists, null, 2)}`
      );
      await db.lists.createMany({ data: lists, skipDuplicates: true });
      log.info(`Inserting ${lists.length} list follows for ${context}...`);
      await db.list_followers.createMany({
        data: lists.map((l) => ({ influencer_id: uid, list_id: l.id })),
        skipDuplicates: true,
      });
    } else
      log.warn(
        `Rate limit hit for getting user (${uid}) followed lists, skipping until ${new Date(
          (listFollowedLimit?.reset ?? 0) * 1000
        ).toLocaleString()}...`
      );

    const listsOwnedLimit = await limits.v2.getRateLimit(
      'users/:id/owned_lists'
    );
    if ((listsOwnedLimit?.remaining ?? 1) > 0) {
      log.info(`Fetching owned lists for ${context}...`);
      const res = await api.v2.listsOwned(uid, {
        'list.fields': [
          'created_at',
          'follower_count',
          'member_count',
          'private',
          'description',
          'owner_id',
        ],
      });
      const lists = res.lists.map(toList);
      log.info(`Inserting ${lists.length} owned lists for ${context}...`);
      log.debug(`User (${uid}) owned lists: ${JSON.stringify(lists, null, 2)}`);
      await db.lists.createMany({ data: lists, skipDuplicates: true });
    } else
      log.warn(
        `Rate limit hit for getting user (${uid}) owned lists, skipping until ${new Date(
          (listFollowedLimit?.reset ?? 0) * 1000
        ).toLocaleString()}...`
      );

    log.info(`Revalidating lists cache for user (${uid})...`);
    await revalidate(getListsQuery(uid));

    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Sync Success', { status: 200, headers });
  } catch (e) {
    if (e instanceof ApiResponseError && e.rateLimitError && e.rateLimit) {
      log.error(
        `You just hit the rate limit! Limit for this endpoint is ${e.rateLimit.limit} requests!`
      );
      log.error(
        `Request counter will reset at timestamp ${new Date(
          e.rateLimit.reset * 1000
        ).toLocaleString()}.`
      );
    }
    throw e;
  }
};
