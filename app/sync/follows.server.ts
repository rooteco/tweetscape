import type { ActionFunction } from 'remix';

import type { Follow, Influencer } from '~/types';
import {
  TwitterV2IncludesHelper,
  USER_FIELDS,
  getTwitterClientForUser,
  handleTwitterApiError,
  toInfluencer,
} from '~/twitter.server';
import { getLoggedInSession, log, warnAboutRateLimit } from '~/utils.server';
import { commitSession } from '~/session.server';
import { db } from '~/db.server';
import { redis } from '~/redis.server';

export const action: ActionFunction = async ({ request }) => {
  try {
    const { session, uid } = await getLoggedInSession(request);
    const { api, limits } = await getTwitterClientForUser(uid);

    const create = {
      influencers: [] as Influencer[],
      follows: [] as Follow[],
    };

    const limit = await limits.v2.getRateLimit('users/:id/following');
    if ((limit?.remaining ?? 1) > 0) {
      log.info(`Fetching following list for user (${uid})...`);
      const key = `latest-followed-user-id:${uid}`;
      const latestFollowedUserId = await redis.get(key);
      log.trace(`Found the latest followed user (${latestFollowedUserId}).`);
      const check = await api.v2.following(uid, { max_results: 1 });
      const latestFollowed = check.data[0];
      if (latestFollowed && latestFollowed.id === latestFollowedUserId) {
        log.debug(`Skipping following list fetch for user (${uid})...`);
      } else {
        if (latestFollowed) await redis.set(key, latestFollowed.id);
        const res = await api.v2.following(uid, {
          'user.fields': USER_FIELDS,
          'max_results': 1000,
        });
        const includes = new TwitterV2IncludesHelper(res);
        includes.users.forEach((i) => create.influencers.push(toInfluencer(i)));
        res.data.forEach((u) => {
          create.influencers.push(toInfluencer(u));
          create.follows.push({
            follower_influencer_id: uid,
            followed_influencer_id: u.id,
          });
        });
      }
    } else {
      warnAboutRateLimit(limit, `getting following list for user (${uid})`);
    }

    log.info(`Inserting ${create.influencers.length} influencers...`);
    log.info(`Inserting ${create.follows.length} follows...`);
    const skipDuplicates = true;
    await db.$transaction([
      db.influencers.createMany({ data: create.influencers, skipDuplicates }),
      db.follows.createMany({ data: create.follows, skipDuplicates }),
    ]);

    // TODO: Invalid or revalidate feed query.

    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Sync Success', { status: 200, headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
