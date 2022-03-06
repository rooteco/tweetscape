drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;

create domain url as text check (value ~ '^https?:\/\/\S+$');
create table influencers (
  "id" text unique not null primary key,
  "hive_id" text unique,
  "name" text not null,
  "username" text not null,
  "profile_image_url" url,
  "attention_score" numeric,
  "attention_score_change_week" numeric,
  "insider_score" numeric,
  "organization_rank" integer,
  "personal_rank" integer,
  "rank" integer,
  "followers_count" integer,
  "following_count" integer,
  "tweets_count" integer,
  "created_at" timestamptz,
  "updated_at" timestamptz
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
  coalesce(attention_score, 0) as attention_score,
  coalesce(tweets, '[]'::json) as tweets
from links
  left outer join (
    select 
      tweets.link_id, 
      sum(tweets.attention_score) as attention_score,
      json_agg(tweets.*) as tweets
    from (
      select urls.link_id, tweets.* from urls inner join (
        select 
          tweets.*,
          influencers.attention_score,
          to_json(influencers.*) as author 
        from tweets inner join influencers on tweets.author_id = influencers.id
      ) as tweets on tweets.id = urls.tweet_id
    ) as tweets group by tweets.link_id
  ) as tweets on tweets.link_id = links.id
order by attention_score desc;

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
