import type {
  annotation_type,
  annotations,
  clusters,
  images,
  likes,
  links,
  list_followers,
  list_members,
  lists,
  mentions,
  ref_type,
  refs,
  retweets,
  scores,
  tag_type,
  tags,
  tokens,
  tweets,
  urls,
  users,
} from '@prisma/client';

import { html } from '~/utils.server';

export type Annotation = annotations;
export type Cluster = clusters;
export type User = users;
export type Link = links;
export type Like = likes;
export type Retweet = retweets;
export type Mention = mentions;
export type Ref = refs;
export type Score = scores;
export type Tag = tags;
export type Tweet = tweets;
export type URL = urls;
export type Image = images;
export type Token = tokens;
export type List = lists;
export type ListFollower = list_followers;
export type ListMember = list_members;
export type AnnotationType = annotation_type;
export type RefType = ref_type;
export type TagType = tag_type;

export type ListJS = { id: string; name: string };
export type ClusterJS = { slug: string; name: string };
export type TweetFull = Tweet & {
  author: User;
  score?: Score;
  liked?: boolean;
  retweeted?: boolean;
  refs?: (Ref | null)[];
  ref_tweets?: (TweetFull | null)[];
  ref_authors?: (User | null)[];
  ref_likes?: (Like | null)[];
  ref_retweets?: (Retweet | null)[];
};
export type ArticleFull = Link & {
  cluster_id?: bigint;
  cluster_name?: string;
  cluster_slug?: string;
  insider_score?: number;
  attention_score?: number;
  tweets: TweetFull[];
};

export type UserJS = Pick<
  User,
  | 'name'
  | 'username'
  | 'verified'
  | 'following_count'
  | 'followers_count'
  | 'profile_image_url'
> & { html: string };
export type TweetJS = Pick<
  Tweet,
  'like_count' | 'reply_count' | 'retweet_count' | 'quote_count' | 'created_at'
> & {
  id: string;
  html: string;
  retweeted: boolean;
  liked: boolean;
  author: UserJS;
  retweets: TweetJS[];
  quotes: TweetJS[];
  attention_score?: number;
};
export type ArticleJS = Pick<
  Link,
  'url' | 'unwound_url' | 'title' | 'description'
> & { tweets: TweetJS[]; attention_score?: number };

export function wrapUser(user: User): UserJS {
  return {
    name: user.name,
    username: user.username,
    verified: user.verified,
    following_count: user.following_count,
    followers_count: user.followers_count,
    profile_image_url: user.profile_image_url,
    html: html(user.description ?? ''),
  };
}
export function wrapRefs(tweet: TweetFull, type: RefType): TweetFull[] {
  const isRef = (id: bigint) =>
    tweet.refs?.some((r) => r?.referenced_tweet_id === id && r?.type === type);
  return (tweet.ref_tweets ?? [])
    .filter((t) => t && isRef(t.id))
    .map((t) => ({
      ...(t as TweetFull),
      author: tweet.ref_authors?.find((u) => u?.id === t?.author_id) as User,
      liked: tweet.ref_likes?.some((l) => l?.tweet_id === t?.id),
      retweeted: tweet.ref_retweets?.some((r) => r?.tweet_id === t?.id),
    }));
}
export function wrapTweet(tweet: TweetFull): TweetJS {
  return {
    like_count: tweet.like_count,
    reply_count: tweet.reply_count,
    retweet_count: tweet.retweet_count,
    quote_count: tweet.quote_count,
    created_at: tweet.created_at,
    id: tweet.id.toString(),
    html: html(tweet.text),
    retweeted: !!tweet.retweeted,
    liked: !!tweet.liked,
    author: wrapUser(tweet.author),
    retweets: wrapRefs(tweet, 'retweeted').map(wrapTweet),
    quotes: wrapRefs(tweet, 'quoted').map(wrapTweet),
    attention_score: Number(tweet.score?.attention_score),
  };
}
export function wrapArticle(article: ArticleFull): ArticleJS {
  return {
    url: article.url,
    unwound_url: article.unwound_url,
    title: article.title,
    description: article.description,
    attention_score: Number(article.attention_score),
    tweets: article.tweets.map(wrapTweet),
  };
}
export function wrapList(list: List): ListJS {
  return { id: list.id.toString(), name: list.name };
}
export function wrapCluster(cluster: Cluster): ClusterJS {
  return { slug: cluster.slug, name: cluster.name };
}
