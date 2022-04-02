import {
  ApiResponseError,
  TwitterApi,
  TwitterV2IncludesHelper,
} from 'twitter-api-v2';
import type {
  ListV2,
  ReferencedTweetV2,
  TTweetv2Expansion,
  TTweetv2TweetField,
  TTweetv2UserField,
  TweetEntityAnnotationsV2,
  TweetEntityHashtagV2,
  TweetEntityUrlV2,
  TweetSearchRecentV2Paginator,
  TweetV2,
  TweetV2ListTweetsPaginator,
  UserV2,
} from 'twitter-api-v2';
import type { Decimal } from '@prisma/client/runtime';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import invariant from 'tiny-invariant';

import type {
  Annotation,
  AnnotationType,
  Image,
  User,
  Link,
  List,
  ListMember,
  Mention,
  Ref,
  Tag,
  TagType,
  Tweet,
  URL,
} from '~/types';
import { TwitterApiRateLimitDBStore } from '~/limit.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

export { TwitterApi, TwitterV2IncludesHelper } from 'twitter-api-v2';

export const USER_FIELDS: TTweetv2UserField[] = [
  'id',
  'name',
  'username',
  'verified',
  'description',
  'profile_image_url',
  'public_metrics',
  'created_at',
];
export const TWEET_FIELDS: TTweetv2TweetField[] = [
  'created_at',
  'entities',
  'author_id',
  'public_metrics',
  'referenced_tweets',
];
export const TWEET_EXPANSIONS: TTweetv2Expansion[] = [
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'entities.mentions.username',
];

export function handleTwitterApiError(e: unknown): never {
  if (e instanceof ApiResponseError && e.rateLimitError && e.rateLimit) {
    const msg1 =
      `You just hit the rate limit! Limit for this endpoint is ` +
      `${e.rateLimit.limit} requests!`;
    const reset = new Date(e.rateLimit.reset * 1000).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'full',
    });
    const msg2 = `Request counter will reset at ${reset}.`;
    log.error(msg1);
    log.error(msg2);
    throw new Error(`${msg1} ${msg2}`);
  }
  throw e;
}

export async function getTwitterClientForUser(
  uid: string
): Promise<{ api: TwitterApi; limits: TwitterApiRateLimitPlugin }> {
  log.info(`Fetching token for user (${uid})...`);
  const token = await db.tokens.findUnique({ where: { user_id: uid } });
  invariant(token, `expected token for user (${uid})`);
  const expiration = token.updated_at.valueOf() + token.expires_in * 1000;
  const limits = new TwitterApiRateLimitPlugin(
    new TwitterApiRateLimitDBStore(uid)
  );
  let api = new TwitterApi(token.access_token, { plugins: [limits] });
  if (expiration < new Date().valueOf()) {
    log.info(
      `User (${uid}) access token expired at ${new Date(
        expiration
      ).toLocaleString('en-US')}, refreshing...`
    );
    const client = new TwitterApi({
      clientId: process.env.OAUTH_CLIENT_ID as string,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
    });
    const { accessToken, refreshToken, expiresIn, scope } =
      await client.refreshOAuth2Token(token.refresh_token);
    log.info(`Storing refreshed token for user (${uid})...`);
    await db.tokens.update({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        scope: scope.join(' '),
        updated_at: new Date(),
      },
      where: { user_id: uid },
    });
    api = new TwitterApi(accessToken, { plugins: [limits] });
  }
  return { api, limits };
}

export function toList(l: ListV2): List {
  return {
    id: l.id,
    owner_id: l.owner_id as string,
    name: l.name,
    description: l.description as string,
    private: l.private as boolean,
    follower_count: l.follower_count as number,
    member_count: l.member_count as number,
    created_at: new Date(l.created_at as string),
  };
}

export function toUser(u: UserV2): User {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    verified: u.verified ?? null,
    description: u.description ?? null,
    profile_image_url: u.profile_image_url ?? null,
    followers_count: u.public_metrics?.followers_count ?? null,
    following_count: u.public_metrics?.following_count ?? null,
    tweets_count: u.public_metrics?.tweet_count ?? null,
    created_at: u.created_at ? new Date(u.created_at) : null,
    updated_at: new Date(),
  };
}

export function toAnnotation(
  a: TweetEntityAnnotationsV2,
  t: TweetV2
): Annotation {
  return {
    tweet_id: t.id,
    normalized_text: a.normalized_text,
    probability: a.probability as unknown as Decimal,
    type: a.type as AnnotationType,
    start: a.start,
    end: a.end,
  };
}

export function toTag(h: TweetEntityHashtagV2, t: TweetV2, type: TagType): Tag {
  return {
    type,
    tweet_id: t.id,
    tag: h.tag,
    start: h.start,
    end: h.end,
  };
}

export function toRef(r: ReferencedTweetV2, t: TweetV2): Ref {
  return {
    referenced_tweet_id: r.id,
    referencer_tweet_id: t.id,
    type: r.type,
  };
}

export function toTweet(tweet: TweetV2): Tweet {
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

export function toLink(u: TweetEntityUrlV2): Link {
  return {
    url: u.expanded_url,
    display_url: u.display_url,
    status: u.status ? Number(u.status) : null,
    title: u.title ?? null,
    description: u.description ?? null,
    unwound_url: u.unwound_url,
  };
}

export function toURL(u: TweetEntityUrlV2, t: TweetV2): URL {
  return {
    link_url: u.expanded_url,
    tweet_id: t.id,
    start: u.start,
    end: u.end,
  };
}

export function toImages(u: TweetEntityUrlV2): Image[] {
  return (u.images ?? []).map((i) => ({
    link_url: u.expanded_url,
    url: i.url,
    width: i.width,
    height: i.height,
  }));
}

type CreateQueue = {
  users: User[];
  list_members: ListMember[];
  tweets: Tweet[];
  mentions: Mention[];
  annotations: Annotation[];
  tags: Tag[];
  refs: Ref[];
  links: Link[];
  images: Image[];
  urls: URL[];
};
export function toCreateQueue(
  res: TweetV2ListTweetsPaginator | TweetSearchRecentV2Paginator,
  queue: CreateQueue = {
    users: [] as User[],
    list_members: [] as ListMember[],
    tweets: [] as Tweet[],
    mentions: [] as Mention[],
    annotations: [] as Annotation[],
    tags: [] as Tag[],
    refs: [] as Ref[],
    links: [] as Link[],
    images: [] as Image[],
    urls: [] as URL[],
  },
  listId?: string
) {
  const includes = new TwitterV2IncludesHelper(res);
  const authors = includes.users.map(toUser);
  authors.forEach((i) => queue.users.push(i));
  includes.tweets.map(toTweet).forEach((r) => queue.tweets.push(r));
  res.tweets.map(toTweet).forEach((t) => queue.tweets.push(t));
  res.tweets.forEach((t) => {
    if (listId)
      queue.list_members.push({
        user_id: t.author_id as string,
        list_id: listId,
      });
    t.entities?.mentions?.forEach((m) => {
      const mid = authors.find((u) => u.username === m.username)?.id;
      if (mid)
        queue.mentions.push({
          tweet_id: t.id,
          user_id: mid,
          start: m.start,
          end: m.end,
        });
    });
    t.entities?.annotations?.forEach((a) =>
      queue.annotations.push(toAnnotation(a, t))
    );
    t.entities?.hashtags?.forEach((h) =>
      queue.tags.push(toTag(h, t, 'hashtag'))
    );
    t.entities?.cashtags?.forEach((c) =>
      queue.tags.push(toTag(c, t, 'cashtag'))
    );
    t.referenced_tweets?.forEach((r) => {
      // Address edge-case where the referenced tweet may be
      // inaccessible to us (e.g. private account) or deleted.
      if (queue.tweets.some((tw) => tw.id === r.id))
        queue.refs.push(toRef(r, t));
    });
    t.entities?.urls?.forEach((u) => {
      queue.links.push(toLink(u));
      queue.urls.push(toURL(u, t));
      toImages(u).forEach((i) => queue.images.push(i));
    });
  });
  return queue;
}

export async function executeCreateQueue(queue: CreateQueue) {
  log.info(`Creating ${queue.users.length} tweet authors...`);
  log.info(`Creating ${queue.list_members.length} list members...`);
  log.info(`Creating ${queue.tweets.length} tweets...`);
  log.info(`Creating ${queue.mentions.length} mentions...`);
  log.info(`Creating ${queue.tags.length} hashtags and cashtags...`);
  log.info(`Creating ${queue.refs.length} tweet refs...`);
  log.info(`Creating ${queue.links.length} links...`);
  log.info(`Creating ${queue.images.length} link images...`);
  log.info(`Creating ${queue.urls.length} tweet urls...`);
  const skipDuplicates = true;
  await db.$transaction([
    db.users.createMany({ data: queue.users, skipDuplicates }),
    db.list_members.createMany({ data: queue.list_members, skipDuplicates }),
    db.tweets.createMany({ data: queue.tweets, skipDuplicates }),
    db.mentions.createMany({ data: queue.mentions, skipDuplicates }),
    db.annotations.createMany({ data: queue.annotations, skipDuplicates }),
    db.tags.createMany({ data: queue.tags, skipDuplicates }),
    db.refs.createMany({ data: queue.refs, skipDuplicates }),
    db.links.createMany({ data: queue.links, skipDuplicates }),
    db.images.createMany({ data: queue.images, skipDuplicates }),
    db.urls.createMany({ data: queue.urls, skipDuplicates }),
  ]);
}
