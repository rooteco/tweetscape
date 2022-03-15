drop view articles;
drop table urls;
drop table links;
drop type image;
drop table tags;
drop type tag_type;
drop table annotations;
drop type annotation_type;
drop table mentions;
drop table refs;
drop type ref_type;
drop table tweets;
drop table scores; 
drop table influencers;
drop domain url;
drop table clusters;

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
  "created_at" timestamptz not null
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
create type image as (
  "url" url,
  "width" integer,
  "height" integer
);
create table links (
  "id" bigint generated always as identity primary key,
  "url" url unique not null,
  "expanded_url" url unique not null,
  "display_url" text not null,
  "images" image[],
  "status" integer,
  "title" text,
  "description" text,
  "unwound_url" url 
);
create table urls (
  "tweet_id" text references tweets(id) deferrable not null,
  "link_id" bigint references links(id) deferrable not null,
  "start" integer not null,
  "end" integer not null,
  primary key ("tweet_id", "link_id")
);
create view articles as
  select
    links.*,
    clusters.id as cluster_id,
    clusters.name as cluster_name,
    clusters.slug as cluster_slug,
    sum(tweets.insider_score) as insider_score,
    sum(tweets.attention_score) as attention_score,
    json_agg(tweets.*) as tweets
  from links
    inner join (
      select distinct on (tweets.author_id, urls.link_id)
        urls.link_id as link_id,
        tweets.*
      from urls
        inner join (
          select 
            tweets.*,
            scores.cluster_id as cluster_id,
            scores.insider_score as insider_score,
            scores.attention_score as attention_score,
            to_json(influencers.*) as author,
            to_json(scores.*) as score
          from tweets
            inner join influencers on influencers.id = tweets.author_id
            inner join scores on scores.influencer_id = influencers.id
        ) as tweets on tweets.id = urls.tweet_id
    ) as tweets on tweets.link_id = links.id
    inner join clusters on clusters.id = tweets.cluster_id
  group by links.id, clusters.id
order by attention_score desc;
