import type {
  annotation_type,
  annotations,
  clusters,
  images,
  influencers,
  links,
  lists,
  mentions,
  ref_type,
  refs,
  scores,
  tag_type,
  tags,
  tokens,
  tweets,
  urls,
} from '@prisma/client';

export type Annotation = annotations;
export type Cluster = clusters;
export type Influencer = influencers;
export type Link = links;
export type Mention = mentions;
export type Ref = refs;
export type Score = scores;
export type Tag = tags;
export type Tweet = tweets;
export type URL = urls;
export type Image = images;
export type Token = tokens;
export type List = lists;
export type AnnotationType = annotation_type;
export type RefType = ref_type;
export type TagType = tag_type;
export type Article = Link & {
  cluster_id?: string;
  cluster_name?: string;
  cluster_slug?: string;
  insider_score?: number;
  attention_score?: number;
  tweets: (Tweet & { html?: string; author: Influencer; score?: Score })[];
};
