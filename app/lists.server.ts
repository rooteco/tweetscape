import type { ActionFunction } from 'remix';

import type { Influencer, List, ListFollower } from '~/types';
import {
  TwitterV2IncludesHelper,
  USER_FIELDS,
  getTwitterClientForUser,
  handleTwitterApiError,
  toInfluencer,
  toList,
} from '~/twitter.server';
import { getLoggedInSession, log } from '~/utils.server';
import { commitSession } from '~/session.server';
import { db } from '~/db.server';
import { revalidateLists } from '~/query.server';

export const action: ActionFunction = async ({ request }) => {
  try {
    const { session, uid } = await getLoggedInSession(request);
    const context = `user (${uid}) lists`;
    const { api, limits } = await getTwitterClientForUser(uid);

    const create = {
      influencers: [] as Influencer[],
      lists: [] as List[],
      list_followers: [] as ListFollower[],
    };

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
        'user.fields': USER_FIELDS,
      });
      const includes = new TwitterV2IncludesHelper(res);
      includes.users.forEach((i) => create.influencers.push(toInfluencer(i)));
      res.lists.forEach((l) => create.lists.push(toList(l)));
      res.lists.forEach((l) =>
        create.list_followers.push({ influencer_id: uid, list_id: l.id })
      );
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
      res.lists.forEach((l) => create.lists.push(toList(l)));
    } else
      log.warn(
        `Rate limit hit for getting user (${uid}) owned lists, skipping until ${new Date(
          (listFollowedLimit?.reset ?? 0) * 1000
        ).toLocaleString()}...`
      );
    log.info(`Inserting ${create.influencers.length} influencers...`);
    log.info(`Inserting ${create.lists.length} lists...`);
    log.info(`Inserting ${create.list_followers.length} list followers...`);
    const skipDuplicates = true;
    await db.$transaction([
      db.influencers.createMany({ data: create.influencers, skipDuplicates }),
      db.lists.createMany({ data: create.lists, skipDuplicates }),
      db.list_followers.createMany({
        data: create.list_followers,
        skipDuplicates,
      }),
    ]);
    log.info(`Revalidating lists cache for user (${uid})...`);
    await revalidateLists(uid);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Sync Success', { status: 200, headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
