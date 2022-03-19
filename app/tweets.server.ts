import type {
  TweetEntityMentionV2,
  TweetEntityUrlV2,
  TweetV2,
  UserV2,
} from 'twitter-api-v2';
import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import {
  ApiResponseError,
  TwitterV2IncludesHelper,
  getTwitterClientForUser,
  toAnnotation,
  toInfluencer,
  toRef,
  toTag,
  toTweet,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

async function insertMentions(
  mentions: TweetEntityMentionV2[],
  t: TweetV2,
  users: UserV2[]
) {
  const data = mentions
    .map((m) => ({
      tweet_id: t.id,
      influencer_id: users.find((u) => u.username === m.username)?.id as string,
      start: m.start,
      end: m.end,
    }))
    .filter((m) => !!m.influencer_id);
  await db.mentions.createMany({ data, skipDuplicates: true });
}

async function insertURLs(urls: TweetEntityUrlV2[], t: TweetV2) {
  // Prisma doesn't support `insertMany` with a `RETURNING` clause because MySQL
  // doesn't support it (workaround: either this or use plain SQL).
  // @see {@link https://github.com/prisma/prisma/issues/8131}
  const links = await db.$transaction(
    urls.map((u) =>
      db.links.upsert({
        create: {
          url: u.url,
          expanded_url: u.expanded_url,
          display_url: u.display_url,
          status: u.status ? Number(u.status) : undefined,
          title: u.title,
          description: u.description,
          unwound_url: u.unwound_url,
        },
        update: {
          url: u.url,
          display_url: u.display_url,
          status: u.status ? Number(u.status) : undefined,
          title: u.title,
          description: u.description,
          unwound_url: u.unwound_url,
        },
        where: { expanded_url: u.expanded_url },
      })
    )
  );
  await db.images.createMany({
    data: urls
      .map((u, idx) =>
        (u.images ?? []).map((i) => ({
          link_id: links[idx].id,
          url: i.url,
          width: i.width,
          height: i.height,
        }))
      )
      .flat(),
    skipDuplicates: true,
  });
  await db.urls.createMany({
    data: urls.map((u, idx) => ({
      tweet_id: t.id,
      link_id: links[idx].id,
      start: u.start,
      end: u.end,
    })),
    skipDuplicates: true,
  });
}

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
              'profile_image_url',
              'public_metrics',
              'created_at',
            ],
          });
          const includes = new TwitterV2IncludesHelper(res);
          const authors = includes.users.map(toInfluencer);
          log.info(
            `Inserting ${authors.length} tweet authors for ${context}...`
          );
          await db.influencers.createMany({
            data: authors,
            skipDuplicates: true,
          });
          log.info(
            `Inserting ${authors.length} list members for ${context}...`
          );
          await db.list_members.createMany({
            data: authors.map((a) => ({
              list_id: listId,
              influencer_id: a.id,
            })),
            skipDuplicates: true,
          });
          const refs = includes.tweets.map(toTweet);
          log.info(
            `Inserting ${refs.length} referenced tweets for ${context}...`
          );
          await db.tweets.createMany({ data: refs, skipDuplicates: true });
          const tweets = res.tweets.map(toTweet);
          log.info(`Inserting ${tweets.length} tweets for ${context}...`);
          await db.tweets.createMany({ data: tweets, skipDuplicates: true });
          await Promise.all(
            res.tweets
              .map((t) => [
                insertURLs(t.entities?.urls ?? [], t),
                insertMentions(t.entities?.mentions ?? [], t, includes.users),
                db.annotations.createMany({
                  data:
                    t.entities?.annotations?.map((a) => toAnnotation(a, t)) ??
                    [],
                  skipDuplicates: true,
                }),
                db.tags.createMany({
                  data:
                    t.entities?.hashtags?.map((h) => toTag(h, t, 'hashtag')) ??
                    [],
                  skipDuplicates: true,
                }),
                db.tags.createMany({
                  data:
                    t.entities?.cashtags?.map((h) => toTag(h, t, 'cashtag')) ??
                    [],
                  skipDuplicates: true,
                }),
                db.refs.createMany({
                  data: t.referenced_tweets?.map((r) => toRef(r, t)) ?? [],
                  skipDuplicates: true,
                }),
              ])
              .flat()
          );
        } else
          log.warn(
            `Rate limit hit for getting ${context} tweets, skipping until ${new Date(
              (listTweetsLimit?.reset ?? 0) * 1000
            ).toLocaleString()}...`
          );
      })
    );
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
