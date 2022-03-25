import { createHash } from 'crypto';

import type { ActionFunction } from 'remix';

import type {
  Annotation,
  Image,
  Influencer,
  Link,
  ListMember,
  Mention,
  Ref,
  Tag,
  Tweet,
  URL,
} from '~/types';
import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  USER_FIELDS,
  getTwitterClientForUser,
  handleTwitterApiError,
  toCreateQueue,
} from '~/twitter.server';
import { getLoggedInSession, log } from '~/utils.server';
import { commitSession } from '~/session.server';
import { db } from '~/db.server';

export const action: ActionFunction = async ({ request }) => {
  try {
    const { session, uid } = await getLoggedInSession(request);
    const { api, limits } = await getTwitterClientForUser(uid);
    log.info(`Fetching followed and owned lists for user (${uid})...`);
    const [followedLists, ownedLists] = await Promise.all([
      db.list_followers.findMany({ where: { influencer_id: uid } }),
      db.lists.findMany({ where: { owner_id: uid } }),
    ]);
    const listIds = [
      ...followedLists.map((l) => l.list_id),
      ...ownedLists.map((l) => l.id),
    ];
    const listTweetsLimit = await limits.v2.getRateLimit('lists/:id/tweets');

    const create = {
      influencers: [] as Influencer[],
      list_members: [] as ListMember[],
      tweets: [] as Tweet[],
      mentions: [] as Mention[],
      annotations: [] as Annotation[],
      tags: [] as Tag[],
      refs: [] as Ref[],
      links: [] as Link[],
      images: [] as Image[],
      urls: [] as URL[],
    };

    // TODO: This `Promise.all` statement along with the Twitter API rate limit
    // plugin tracker introduces race conditions: the second request may resolve
    // first and thus when the first request resolves, the rate limit is set one
    // higher than it should be. Take a look at these logs for an example:
    // [dev:remix] [debug] Setting user (1329661759020363778) rate limit (880/900 remaining until 3/18/2022, 9:35:27 PM) for: GET https://api.twitter.com/2/lists/:id/tweets
    // [dev:remix] [info] Inserting 49 tweet authors for user (1329661759020363778) list (1504961420084932608)...
    // [dev:remix] [debug] Setting user (1329661759020363778) rate limit (881/900 remaining until 3/18/2022, 9:35:27 PM) for: GET https://api.twitter.com/2/lists/:id/tweets
    await Promise.all(
      listIds.map(async (listId, idx) => {
        const context = `user (${uid}) list (${listId})`;
        if ((listTweetsLimit?.remaining ?? listIds.length) > idx) {
          log.info(`Fetching tweets for ${context}...`);
          const hash = createHash('sha256');
          hash.update(listId);
          hash.update(uid);
          const key = `latest-tweet-id:list-tweets:${hash.digest('hex')}`;
          const latestTweetId = await redis.get(key);
          log.debug(`Found the latest tweet (${listId}): ${latestTweetId}`);
          const check = await api.v2.listTweets(listId, { max_results: 1 });
          const latestTweet = check.tweets[0];
          if (latestTweet && latestTweet.id === latestTweetId)
            return log.info(`Skipping fetch for ${context}...`);
          if (latestTweet) await redis.set(key, check.tweets[0].id);
          const res = await api.v2.listTweets(listId, {
            'tweet.fields': TWEET_FIELDS,
            'expansions': TWEET_EXPANSIONS,
            'user.fields': USER_FIELDS,
          });
          toCreateQueue(res, create, listId);
        } else {
          const reset = new Date((listTweetsLimit?.reset ?? 0) * 1000);
          const msg =
            `Rate limit hit for getting ${context} tweets, skipping ` +
            `until ${reset.toLocaleString()}...`;
          log.warn(msg);
        }
      })
    );
    log.info(`Creating ${create.influencers.length} tweet authors...`);
    log.info(`Creating ${create.list_members.length} list members...`);
    log.info(`Creating ${create.tweets.length} tweets...`);
    log.info(`Creating ${create.mentions.length} mentions...`);
    log.info(`Creating ${create.tags.length} hashtags and cashtags...`);
    log.info(`Creating ${create.refs.length} tweet refs...`);
    log.info(`Creating ${create.links.length} links...`);
    log.info(`Creating ${create.images.length} link images...`);
    log.info(`Creating ${create.urls.length} tweet urls...`);
    const skipDuplicates = true;
    await db.$transaction([
      db.influencers.createMany({ data: create.influencers, skipDuplicates }),
      db.list_members.createMany({ data: create.list_members, skipDuplicates }),
      db.tweets.createMany({ data: create.tweets, skipDuplicates }),
      db.mentions.createMany({ data: create.mentions, skipDuplicates }),
      db.annotations.createMany({ data: create.annotations, skipDuplicates }),
      db.tags.createMany({ data: create.tags, skipDuplicates }),
      db.refs.createMany({ data: create.refs, skipDuplicates }),
      db.links.createMany({ data: create.links, skipDuplicates }),
      db.images.createMany({ data: create.images, skipDuplicates }),
      db.urls.createMany({ data: create.urls, skipDuplicates }),
    ]);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Sync Success', { status: 200, headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
