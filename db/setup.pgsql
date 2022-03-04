create domain url as text check (value ~ '^https?:\/\/\S+$');

create type social_account as (
  "created_at" timestamptz,
  "followers_count" integer,
  "following_count" integer,
  "id" text,
  "name" text,
  "personal" boolean,
  "profile_image_url" url,
  "screen_name" text,
  "tweets_count" integer,
  "updated_at" timestamptz
);

create table influencers (
  "twitter_id" text unique not null primary key,
  "hive_id" text unique not null,
  "attention_score" numeric not null,
  "attention_score_change_week" numeric not null,
  "created_at" timestamptz not null,
  "insider_score" numeric not null,
  "personal_rank" integer not null,
  "rank" integer not null,
  "social_account" social_account not null 
);

create type url as (
  "start" integer,
  "end" integer,
  "url" url,
  "expanded_url" url,
  "display_url" text,
  "images" image[],
  "status" integer,
  "title" text,
  "description" text,
  "unwound_url" url
);

create type mention as (
  "start" integer,
  "end" integer,
  "username" text,
  "id" text
);

create type annotation_type as enum('Organization', 'Place', 'Person', 'Product');
create type annotation as (
  "start" integer,
  "end" integer,
  "probability" numeric,
  "type" annotation_type,
  "normalized_text" text
);

create type tag as (
  "start" integer,
  "end" integer,
  "tag" text 
);

create table tweets (
  "twitter_id" text unique not null primary key,
  "author_id" text references influencers(twitter_id),
  "text" text not null,
  "retweet_count" integer not null,
  "reply_count" integer not null,
  "like_count" integer not null,
  "quote_count" integer not null,
  "urls" url[],
  "mentions" mention[],
  "annotations" annotation[],
  "hashtags" tag[],
  "cashtags" tag[],
  "created_at" timestamptz not null
);

create type tweet_ref_type as enum('quoted', 'retweeted', 'replied_to');
create table tweet_refs (
  "twitter_id" text unique not null primary key,
  "type" tweet_ref_type not null,
  "referencer_tweet_id" text references tweets(twitter_id)
);
