drop table if exists urls cascade;
drop table if exists images cascade;
drop table if exists links cascade;
drop table if exists tags cascade;
drop type if exists tag_type cascade;
drop table if exists annotations cascade;
drop type if exists annotation_type cascade;
drop table if exists mentions cascade;
drop table if exists refs cascade;
drop type if exists ref_type cascade;
drop table if exists retweets cascade;
drop table if exists likes cascade;
drop table if exists tweets cascade;
drop table if exists scores cascade; 
drop table if exists rekt cascade;
drop table if exists tokens cascade;
drop table if exists list_followers cascade;
drop table if exists list_members cascade;
drop table if exists lists cascade;
drop table if exists users cascade;
drop domain if exists url cascade;
drop table if exists clusters cascade;

create table clusters (
  "id" bigint unique not null primary key, 
  "name" text unique not null,
  "slug" text unique not null,
  "active" boolean not null default false,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  "visible" boolean not null default false
);
create domain url as text check (value ~ '^https?:\/\/.+$');
create table users (
  "id" bigint unique not null primary key,
  "name" text not null,
  "username" text not null,
  "verified" boolean,
  "description" text,
  "profile_image_url" url,
  "followers_count" integer,
  "following_count" integer,
  "tweets_count" integer,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
create table lists (
  "id" bigint unique not null primary key,
  "owner_id" bigint references users(id) deferrable not null,
  "name" text not null,
  "description" text not null,
  "private" boolean not null,
  "follower_count" integer not null,
  "member_count" integer not null,
  "created_at" timestamptz not null
);
create table list_members (
  "user_id" bigint references users(id) deferrable not null,
  "list_id" bigint references lists(id) deferrable not null,
  primary key ("user_id", "list_id")
);
create table list_followers (
  "user_id" bigint references users(id) deferrable not null,
  "list_id" bigint references lists(id) deferrable not null,
  primary key ("user_id", "list_id")
);
create table tokens (
  "user_id" bigint unique references users(id) deferrable not null primary key,
  "token_type" text not null,
  "expires_in" integer not null,
  "access_token" text not null unique,
  "scope" text not null,
  "refresh_token" text not null unique,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null
);
create table scores (
  "id" bigint unique not null primary key,
  "user_id" bigint references users(id) deferrable not null,
  "cluster_id" bigint references clusters(id) deferrable not null,
  "attention_score" numeric not null,
  "attention_score_change_week" numeric,
  "insider_score" numeric not null,
  "organization_rank" integer,
  "personal_rank" integer,
  "rank" integer not null,
  "created_at" timestamptz not null,
  unique ("cluster_id", "user_id"),
  unique ("cluster_id", "rank")
);
create table rekt (
  "id" bigint unique not null primary key,
  "user_id" bigint references users(id) deferrable not null,
  "username" text not null,
  "name" text not null,
  "profile_image_url" url not null,
  "points" integer not null,
  "rank" integer not null unique,
  "followers_count" integer,
  "followers_in_people_count" integer not null 
);
create table tweets (
  "id" bigint unique not null primary key,
  "author_id" bigint references users(id) deferrable not null,
  "text" text not null,
  "retweet_count" integer not null,
  "reply_count" integer not null,
  "like_count" integer not null,
  "quote_count" integer not null,
  "created_at" timestamptz not null
);
create table likes (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "user_id" bigint references users(id) deferrable not null,
  primary key ("tweet_id", "user_id")
);
create table retweets (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "user_id" bigint references users(id) deferrable not null,
  primary key ("tweet_id", "user_id")
);
create type ref_type as enum('quoted', 'retweeted', 'replied_to');
create table refs (
  "referenced_tweet_id" bigint references tweets(id) deferrable not null,
  "referencer_tweet_id" bigint references tweets(id) deferrable not null,
  "type" ref_type not null,
  primary key ("referenced_tweet_id", "referencer_tweet_id")
);
create table mentions (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "user_id" bigint references users(id) deferrable not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "user_id")
);
create type annotation_type as enum(
  'Person',
  'Place',
  'Product',
  'Organization', 
  'Other'
);
create table annotations (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "normalized_text" text not null,
  "probability" numeric not null,
  "type" annotation_type not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "normalized_text")
);
create type tag_type as enum('cashtag', 'hashtag');
create table tags (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "tag" text not null,
  "type" tag_type not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "tag", "type")
);
create table links (
  "url" url unique not null primary key,
  "display_url" text not null,
  "status" integer,
  "title" text,
  "description" text,
  "unwound_url" url 
);
create table images (
  "link_url" url references links(url) deferrable not null,
  "url" url not null,
  "width" integer not null,
  "height" integer not null,
  primary key ("link_url", "url", "width", "height")
);
create table urls (
  "tweet_id" bigint references tweets(id) deferrable not null,
  "link_url" url references links(url) deferrable not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "link_url")
);
