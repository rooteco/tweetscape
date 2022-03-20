import type {
  ListV2,
  ReferencedTweetV2,
  TweetEntityAnnotationsV2,
  TweetEntityHashtagV2,
  TweetEntityUrlV2,
  TweetV2,
  UserV2,
} from 'twitter-api-v2';
import type { Decimal } from '@prisma/client/runtime';
import { TwitterApi } from 'twitter-api-v2';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import invariant from 'tiny-invariant';

import type {
  Annotation,
  AnnotationType,
  Image,
  Influencer,
  Link,
  List,
  Ref,
  Tag,
  TagType,
  Tweet,
  URL,
} from '~/types';
import { TwitterApiRateLimitDBStore } from '~/limit.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

export {
  ApiResponseError,
  TwitterApi,
  TwitterV2IncludesHelper,
} from 'twitter-api-v2';

export async function getTwitterClientForUser(
  uid: string
): Promise<{ api: TwitterApi; limits: TwitterApiRateLimitPlugin }> {
  log.info(`Fetching token for user (${uid})...`);
  const token = await db.tokens.findUnique({ where: { influencer_id: uid } });
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
      where: { influencer_id: uid },
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

export function toInfluencer(u: UserV2): Influencer {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
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
