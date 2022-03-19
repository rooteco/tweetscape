drop table if exists urls;
drop table if exists images;
drop table if exists links;
drop table if exists tags;
drop type if exists tag_type;
drop table if exists annotations;
drop type if exists annotation_type;
drop table if exists mentions;
drop table if exists refs;
drop type if exists ref_type;
drop table if exists tweets;
drop table if exists scores; 
drop table if exists tokens;
drop table if exists lists;
drop table if exists limits;
drop table if exists influencers;
drop domain if exists url;
drop table if exists clusters;

create table clusters (
  "id" text unique not null primary key, 
  "name" text unique not null,
  "slug" text unique not null check ("slug" = lower("name")),
  "active" boolean not null default false,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  "visible" boolean not null default false
);
create domain url as text check (value ~ '^https?:\/\/\S+$');
create table influencers (
  "id" text unique not null primary key,
  "name" text not null,
  "username" text not null,
  "profile_image_url" url,
  "followers_count" integer,
  "following_count" integer,
  "tweets_count" integer,
  "created_at" timestamptz,
  "updated_at" timestamptz
);
create table limits (
  "influencer_id" text references influencers(id) deferrable not null,
  "method" text not null,
  "endpoint" text not null,
  "limit" integer not null,
  "reset" integer not null,
  "remaining" integer not null,
  primary key ("influencer_id", "method", "endpoint")
);
create table lists (
  "id" text unique not null primary key,
  "owner_id" text references influencers(id) deferrable not null,
  "name" text not null,
  "description" text not null,
  "private" boolean not null,
  "follower_count" integer not null,
  "member_count" integer not null,
  "created_at" timestamptz not null
);
create table list_members (
  "influencer_id" text references influencers(id) deferrable not null,
  "list_id" text references lists(id) deferrable not null,
  primary key ("influencer_id", "list_id")
);
create table list_followers (
  "influencer_id" text references influencers(id) deferrable not null,
  "list_id" text references lists(id) deferrable not null,
  primary key ("influencer_id", "list_id")
);
create table tokens (
  "id" bigint generated always as identity primary key,
  "influencer_id" text unique references influencers(id) deferrable not null,
  "token_type" text not null,
  "expires_in" integer not null,
  "access_token" text not null unique,
  "scope" text not null,
  "refresh_token" text not null unique,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null
);
create table scores (
  "id" text unique not null primary key,
  "influencer_id" text references influencers(id) deferrable not null,
  "cluster_id" text references clusters(id) deferrable not null,
  "attention_score" numeric not null,
  "attention_score_change_week" numeric,
  "insider_score" numeric not null,
  "organization_rank" integer,
  "personal_rank" integer,
  "rank" integer not null,
  "created_at" timestamptz not null,
  unique ("cluster_id", "influencer_id"),
  unique ("cluster_id", "rank")
); 
create table tweets (
  "id" text unique not null primary key,
  "author_id" text references influencers(id) deferrable not null,
  "text" text not null,
  "retweet_count" integer not null,
  "reply_count" integer not null,
  "like_count" integer not null,
  "quote_count" integer not null,
  "created_at" timestamptz not null
);
create type ref_type as enum('quoted', 'retweeted', 'replied_to');
create table refs (
  "referenced_tweet_id" text references tweets(id) deferrable not null,
  "referencer_tweet_id" text references tweets(id) deferrable not null,
  "type" ref_type not null,
  primary key ("referenced_tweet_id", "referencer_tweet_id")
);
create table mentions (
  "tweet_id" text references tweets(id) deferrable not null,
  "influencer_id" text references influencers(id) deferrable not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "influencer_id")
);
create type annotation_type as enum(
  'Person',
  'Place',
  'Product',
  'Organization', 
  'Other'
);
create table annotations (
  "tweet_id" text references tweets(id) deferrable not null,
  "normalized_text" text not null,
  "probability" numeric not null,
  "type" annotation_type not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "normalized_text")
);
create type tag_type as enum('cashtag', 'hashtag');
create table tags (
  "tweet_id" text references tweets(id) deferrable not null,
  "tag" text not null,
  "type" tag_type not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "tag", "type")
);
create table links (
  "id" bigint generated always as identity primary key,
  "url" url unique not null,
  "expanded_url" url unique not null,
  "display_url" text not null,
  "status" integer,
  "title" text,
  "description" text,
  "unwound_url" url 
);
create table images (
  "link_id" bigint references links(id) deferrable not null,
  "url" url not null,
  "width" integer not null,
  "height" integer not null,
  primary key ("link_id", "url", "width", "height")
);
create table urls (
  "tweet_id" text references tweets(id) deferrable not null,
  "link_id" bigint references links(id) deferrable not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "link_id")
);
