import type {
  ReferencedTweetV2,
  TweetEntityAnnotationsV2,
  TweetEntityHashtagV2,
  TweetEntityMentionV2,
  TweetEntityUrlV2,
  TweetV2,
} from 'twitter-api-v2';
import type { Decimal } from '@prisma/client/runtime';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import type {
  Annotation,
  AnnotationType,
  Mention,
  Ref,
  Tag,
  TagType,
  Tweet,
} from '~/types';
import { TwitterApi, TwitterV2IncludesHelper } from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

function toAnnotation(a: TweetEntityAnnotationsV2, t: TweetV2): Annotation {
  return {
    tweet_id: t.id,
    normalized_text: a.normalized_text,
    probability: a.probability as unknown as Decimal,
    type: a.type as AnnotationType,
    start: a.start,
    end: a.end,
  };
}

function toMention(m: TweetEntityMentionV2, t: TweetV2): Mention {
  return {
    tweet_id: t.id,
    influencer_id: m.id,
    start: m.start,
    end: m.end,
  };
}

function toTag(h: TweetEntityHashtagV2, t: TweetV2, type: TagType): Tag {
  return {
    type,
    tweet_id: t.id,
    tag: h.tag,
    start: h.start,
    end: h.end,
  };
}

function toRef(r: ReferencedTweetV2, t: TweetV2): Ref {
  return {
    referenced_tweet_id: r.id,
    referencer_tweet_id: t.id,
    type: r.type,
  };
}

function toTweet(tweet: TweetV2): Tweet {
  return {
    id: tweet.id,
    author_id: tweet.author_id as string,
    text: tweet.text,
    retweet_count: tweet.public_metrics?.retweet_count as number,
    reply_count: tweet.public_metrics?.reply_count as number,
    like_count: tweet.public_metrics?.like_count as number,
    quote_count: tweet.public_metrics?.quote_count as number,
    created_at: new Date(tweet.created_at as string),
  };
}

async function insertURLs(urls: TweetEntityUrlV2[], t: TweetV2) {
  // Prisma doesn't support `insertMany` with a `RETURNING` clause because MySQL
  // doesn't support it (workaround: either this or use plain SQL).
  // @see {@link https://github.com/prisma/prisma/issues/8131}
  const links = await db.$transaction(
    urls.map((u) =>
      db.links.create({
        data: {
          url: u.url,
          expanded_url: u.expanded_url,
          display_url: u.display_url,
          status: Number(u.status),
          title: u.title,
          description: u.description,
          unwound_url: u.unwound_url,
        },
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
  log.info(`Fetching lists for user (${uid})...`);
  const lists = await db.lists.findMany({ where: { owner_id: uid } });
  const api = new TwitterApi(token.access_token);
  await Promise.all(
    lists.map(async (list) => {
      const context = `user (${uid}) list ${list.name} (${list.id})`;
      log.info(`Fetching tweets for ${context}...`);
      const res = await api.v2.listTweets(list.id, {
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
      });
      const includes = new TwitterV2IncludesHelper(res);
      log.info(`Inserting ${includes.users.length} users for ${context}...`);
      await db.influencers.createMany({
        data: includes.users,
        skipDuplicates: true,
      });
      const referencedTweets = includes.tweets.map(toTweet);
      log.info(
        `Inserting ${referencedTweets.length} referenced tweets for ${context}...`
      );
      await db.tweets.createMany({
        data: referencedTweets,
        skipDuplicates: true,
      });
      const tweets = res.tweets.map(toTweet);
      log.info(`Inserting ${tweets.length} tweets for ${context}...`);
      await db.tweets.createMany({ data: tweets, skipDuplicates: true });
      await Promise.all(
        res.tweets
          .map((t) => [
            insertURLs(t.entities?.urls ?? [], t),
            db.mentions.createMany({
              data: t.entities?.mentions.map((m) => toMention(m, t)) ?? [],
              skipDuplicates: true,
            }),
            db.annotations.createMany({
              data:
                t.entities?.annotations.map((a) => toAnnotation(a, t)) ?? [],
              skipDuplicates: true,
            }),
            db.tags.createMany({
              data:
                t.entities?.hashtags.map((h) => toTag(h, t, 'hashtag')) ?? [],
              skipDuplicates: true,
            }),
            db.tags.createMany({
              data:
                t.entities?.cashtags.map((h) => toTag(h, t, 'cashtag')) ?? [],
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
  log.info(`Inserting lists for user (${uid})...`);
  await db.lists.createMany({ data: lists, skipDuplicates: true });
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
