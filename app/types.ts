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
export type UserFull = User & { html?: string };
export type TweetFull = Tweet & {
  html?: string;
  author?: UserFull;
  score?: Score;
  liked?: boolean;
  retweeted?: boolean;
  refs?: (Ref | null)[];
  ref_tweets?: (TweetFull | null)[];
  ref_authors?: (UserFull | null)[];
  ref_likes?: (Like | null)[];
  ref_retweets?: (Retweet | null)[];
};
export type Article = Link & {
  cluster_id: string;
  cluster_name: string;
  cluster_slug: string;
  insider_score: number;
  attention_score: number;
  tweets: TweetFull[];
};
