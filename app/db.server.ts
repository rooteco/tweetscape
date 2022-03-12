import { Pool } from 'pg';

// It's safer to make these all strings so that I always wrap them in the
// front-end code that receives the JSON-ified versions of all these datatypes.
type Date = string;

export interface Cluster {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Link {
  id: number;
  url: string;
  expanded_url: string;
  display_url: string;
  images: { url: string; width: number; height: number }[] | null;
  status: number | null;
  title: string | null;
  description: string | null;
  unwound_url: string | null;
}

export interface Tweet {
  id: string;
  author_id: string;
  text: string;
  html?: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  created_at: Date;
}

export interface Score {
  id: string;
  influencer_id: string;
  cluster_id: string;
  attention_score: number;
  attention_score_change_week: number;
  insider_score: number;
  organization_rank: number | null;
  personal_rank: number | null;
  rank: number;
  created_at: Date;
}

export interface Influencer {
  id: string;
  name: string;
  username: string;
  profile_image_url: string | null;
  followers_count: number | null;
  following_count: number | null;
  tweets_count: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface Article extends Link {
  cluster_id: string;
  cluster_name: string;
  cluster_slug: string;
  insider_score: number;
  attention_score: number;
  tweets: (Tweet & { author: Influencer; score: Score })[];
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
