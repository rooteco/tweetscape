import { createHash } from 'crypto';

import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

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
  ApiResponseError,
  TwitterV2IncludesHelper,
  getTwitterClientForUser,
  toAnnotation,
  toImages,
  toInfluencer,
  toLink,
  toRef,
  toTag,
  toTweet,
  toURL,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { revalidateListsCache } from '~/query.server';

export const action: ActionFunction = async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'));
    const uid = session.get('uid') as string | undefined;
    invariant(uid, 'expected session uid');
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
            'tweet.fields': [
              'created_at',
              'entities',
              'author_id',
              'public_metrics',
              'referenced_tweets',
            ],
            'expansions': [
              'referenced_tweets.id',
              'referenced_tweets.id.author_id',
              'entities.mentions.username',
            ],
            'user.fields': [
              'id',
              'name',
              'username',
              'description',
              'profile_image_url',
              'public_metrics',
              'created_at',
            ],
          });
          const includes = new TwitterV2IncludesHelper(res);
          const authors = includes.users.map(toInfluencer);
          authors.forEach((i) => create.influencers.push(i));
          authors
            .map((a) => ({
              list_id: listId,
              influencer_id: a.id,
            }))
            .forEach((l) => create.list_members.push(l));
          includes.tweets.map(toTweet).forEach((r) => create.tweets.push(r));
          res.tweets.map(toTweet).forEach((t) => create.tweets.push(t));
          res.tweets.forEach((t) => {
            t.entities?.mentions?.forEach((m) => {
              const mid = authors.find((u) => u.username === m.username)?.id;
              if (mid)
                create.mentions.push({
                  tweet_id: t.id,
                  influencer_id: mid,
                  start: m.start,
                  end: m.end,
                });
            });
            t.entities?.annotations?.forEach((a) =>
              create.annotations.push(toAnnotation(a, t))
            );
            t.entities?.hashtags?.forEach((h) =>
              create.tags.push(toTag(h, t, 'hashtag'))
            );
            t.entities?.cashtags?.forEach((c) =>
              create.tags.push(toTag(c, t, 'cashtag'))
            );
            t.referenced_tweets?.forEach((r) => {
              // Address edge-case where the referenced tweet may be
              // inaccessible to us (e.g. private account) or deleted.
              if (create.tweets.some((tw) => tw.id === r.id))
                create.refs.push(toRef(r, t));
            });
            t.entities?.urls?.forEach((u) => {
              create.links.push(toLink(u));
              create.urls.push(toURL(u, t));
              toImages(u).forEach((i) => create.images.push(i));
            });
          });
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
    await revalidateListsCache(listIds);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Sync Success', { status: 200, headers });
  } catch (e) {
    if (e instanceof ApiResponseError && e.rateLimitError && e.rateLimit) {
      // TODO: Manually update the rate limit stored in PostgreSQL to reflect
      // the updated "0" remaining state as `plugin-rate-limit` doesn't.
      // @see {@link https://github.com/PLhery/node-twitter-api-v2/issues/226}
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
