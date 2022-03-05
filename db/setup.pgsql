create domain href as text check (value ~ '^https?:\/\/\S+$');

create table influencers (
  "twitter_id" text unique not null primary key,
  "hive_id" text unique not null,
  "attention_score" numeric not null,
  "attention_score_change_week" numeric not null,
  "insider_score" numeric not null,
  "personal_rank" integer not null,
  "rank" integer not null,
  "created_at" timestamptz not null,
  "followers_count" integer not null,
  "following_count" integer not null,
  "name" text not null,
  "personal" boolean not null,
  "profile_image_url" href not null,
  "screen_name" text not null,
  "tweets_count" integer not null,
  "updated_at" timestamptz not null
);

create type image as (
  "url" href,
  "width" integer,
  "height" integer
);
create type url as (
  "start" integer,
  "end" integer,
  "url" href,
  "expanded_url" href,
  "display_url" text,
  "images" image[],
  "status" integer,
  "title" text,
  "description" text,
  "unwound_url" href 
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
  "urls" url[] not null default array[]::url[],
  "mentions" mention[] not null default array[]::mention[],
  "annotations" annotation[] not null default array[]::annotation[],
  "hashtags" tag[] not null default array[]::tag[],
  "cashtags" tag[] not null default array[]::tag[],
  "created_at" timestamptz not null
);

create type tweet_ref_type as enum('quoted', 'retweeted', 'replied_to');
create table tweet_refs (
  "twitter_id" text unique not null primary key,
  "type" tweet_ref_type not null,
  "referencer_tweet_id" text references tweets(twitter_id)
);
