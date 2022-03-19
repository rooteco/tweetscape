import type {
  TweetEntityMentionV2,
  TweetEntityUrlV2,
  TweetV2,
  UserV2,
} from 'twitter-api-v2';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import {
  TwitterApi,
  TwitterV2IncludesHelper,
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

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(uid, 'expected session uid');
  log.info(`Fetching token for user (${uid})...`);
  const token = await db.tokens.findUnique({ where: { influencer_id: uid } });
  invariant(token, `expected token for user (${uid})`);
  log.info(`Fetching followed and owned lists for user (${uid})...`);
  const [followedLists, ownedLists] = await Promise.all([
    db.list_followers.findMany({ where: { influencer_id: uid } }),
    db.lists.findMany({ where: { owner_id: uid } }),
  ]);
  const listIds = [
    ...followedLists.map((l) => l.list_id),
    ...ownedLists.map((l) => l.id),
  ];
  const api = new TwitterApi(token.access_token);
  await Promise.all(
    listIds.map(async (listId) => {
      const context = `user (${uid}) list (${listId})`;
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
      log.info(`Inserting ${authors.length} tweet authors for ${context}...`);
      await db.influencers.createMany({ data: authors, skipDuplicates: true });
      log.info(`Inserting ${authors.length} list members for ${context}...`);
      await db.list_members.createMany({
        data: authors.map((a) => ({ list_id: listId, influencer_id: a.id })),
        skipDuplicates: true,
      });
      const refs = includes.tweets.map(toTweet);
      log.info(`Inserting ${refs.length} referenced tweets for ${context}...`);
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
                t.entities?.annotations?.map((a) => toAnnotation(a, t)) ?? [],
              skipDuplicates: true,
            }),
            db.tags.createMany({
              data:
                t.entities?.hashtags?.map((h) => toTag(h, t, 'hashtag')) ?? [],
              skipDuplicates: true,
            }),
            db.tags.createMany({
              data:
                t.entities?.cashtags?.map((h) => toTag(h, t, 'cashtag')) ?? [],
              skipDuplicates: true,
            }),
            db.refs.createMany({
              data: t.referenced_tweets?.map((r) => toRef(r, t)) ?? [],
              skipDuplicates: true,
            }),
          ])
          .flat()
      );
    })
  );
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
