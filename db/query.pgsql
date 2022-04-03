-- setClusterVisibility()
update clusters set visible = clusters.slug = any (
  select distinct clusters.slug from clusters 
  inner join scores on scores.cluster_id = clusters.id
);

-- getClusterTweets()
explain analyze select
  tweets.*,
  likes is not null as liked,
  retweets is not null as retweeted,
  to_json(users.*) as author,
  json_agg(refs.*) as refs,
  json_agg(ref_tweets.*) as ref_tweets,
  json_agg(ref_likes.*) as ref_likes,
  json_agg(ref_retweets.*) as ref_retweets,
  json_agg(ref_authors.*) as ref_authors
from tweets
  inner join users on users.id = tweets.author_id
  inner join scores on scores.user_id = tweets.author_id
  inner join clusters on clusters.id = scores.cluster_id and clusters.slug = 'ethereum'     
  left outer join likes on likes.tweet_id = tweets.id and likes.user_id = '1502034451617910790'
  left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = '1502034451617910790'
  left outer join refs on refs.referencer_tweet_id = tweets.id
  left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
  left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
  left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = '1502034451617910790'
  left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = '1502034451617910790'   
group by tweets.id,likes.*,retweets.*,users.id
order by created_at desc
limit 50;

-- getClusterArticles()
explain select
  links.*,
  sum(tweets.insider_score) as insider_score,
  sum(tweets.attention_score) as attention_score,
  json_agg(tweets.*) as tweets
from links
  inner join (
    select distinct on (urls.link_url, tweets.author_id, tweets.cluster_id)
      urls.link_url as link_url,
      tweets.*
    from urls
      inner join (
        select
          tweets.*,
          scores.cluster_id as cluster_id,
          scores.insider_score as insider_score,
          scores.attention_score as attention_score,
          to_json(scores.*) as score,
          likes is not null as liked,
          retweets is not null as retweeted,
          to_json(users.*) as author,
          quote.referenced_tweet_id as quote_id,
          json_agg(refs.*) as refs,
          json_agg(ref_tweets.*) as ref_tweets,
          json_agg(ref_likes.*) as ref_likes,
          json_agg(ref_retweets.*) as ref_retweets,
          json_agg(ref_authors.*) as ref_authors
        from tweets
          inner join users on users.id = tweets.author_id
          inner join scores on scores.user_id = tweets.author_id
          inner join clusters on clusters.id = scores.cluster_id
          left outer join likes on likes.tweet_id = tweets.id
          left outer join retweets on retweets.tweet_id = tweets.id
          left outer join refs quote on quote.referencer_tweet_id = tweets.id and quote.type = 'quoted'
          left outer join refs retweet on retweet.referencer_tweet_id = tweets.id and retweet.type = 'retweeted'
          left outer join refs on refs.referencer_tweet_id = tweets.id
          left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
          left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
          left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = '1502034451617910790'
          left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = '1502034451617910790'
        where retweet is null and likes.user_id = '1502034451617910790' and retweets.user_id = '1502034451617910790' and clusters.slug = 'ethereum'
        group by tweets.id,quote.referenced_tweet_id,likes.*,retweets.*,scores.id,users.id
      ) as tweets on urls.tweet_id in (tweets.id, tweets.quote_id)
  ) as tweets on tweets.link_url = links.url
where url !~ '^https?:\\/\\/twitter\\.com'
group by links.url
order by attention_score desc
limit 50;
