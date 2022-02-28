interface SocialAccount {
  created_at: string;
  followers_count: string;
  following_count: string;
  id: string;
  name: string;
  personal: boolean;
  profile_image_url: string;
  screen_name: string;
  tweets_count: string;
  updated_at: string;
}

export interface Influencer {
  attention_score: number;
  attention_score_change_week: number;
  cluster_id: string;
  created_at: string;
  id: string;
  identity: {
    clusters: unknown[];
    id: string;
    social_accounts: { social_account: SocialAccount }[];
  };
  insider_score: number;
  personal_rank: string;
  rank: string;
  social_account: { social_account: SocialAccount };
}

interface Entity {
  start: number;
  end: number;
}

export interface URL extends Entity {
  url: string;
  expanded_url: string;
  display_url: string;
  images?: { url: string; width: number; height: number }[];
  status?: number;
  title?: string;
  description?: string;
  unwound_url?: string;
}

interface Tag extends Entity {
  tag: string;
}

interface Mention extends Entity {
  username: string;
  id: string;
}

interface Annotation extends Entity {
  probability: number;
  type: 'Organization' | 'Place' | 'Person' | 'Product';
  normalized_text: string;
}

export interface TweetRef {
  type: 'quoted' | 'retweeted' | 'replied_to';
  id: string;
}

export interface Tweet {
  author?: Influencer;
  author_id: string;
  text: string;
  referenced_tweets: TweetRef[];
  id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  entities?: {
    urls?: URL[];
    mentions?: Mention[];
    annotations?: Annotation[];
    hashtags?: Tag[];
    cashtags?: Tag[];
  };
  created_at: string;
}

export interface Article {
  url: string;
  domain: string;
  title: string;
  description: string;
  tweets: Tweet[];
}
