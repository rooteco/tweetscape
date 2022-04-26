import type { ArticleFull, List, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_TIME,
  DEFAULT_TWEETS_LIMIT,
  Time,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { log } from '~/utils.server';
import { swr } from '~/swr.server';

const TWEETS_TIMES: Record<Time, string> = {
  [Time.Day]: `tweets.created_at > current_date - 1`,
  [Time.Week]: `tweets.created_at > current_date - 7`,
  [Time.Month]: `tweets.created_at > current_date - 30`,
  [Time.Year]: `tweets.created_at > current_date - 365`,
  [Time.Decade]: `tweets.created_at > current_date - 3650`,
  [Time.Century]: `tweets.created_at > current_date - 36500`,
};
const TWEETS_ORDER_BY: Record<TweetsSort, string> = {
  [TweetsSort.TweetCount]: `(tweets.retweet_count + tweets.quote_count) desc`,
  [TweetsSort.RetweetCount]: `tweets.retweet_count desc`,
  [TweetsSort.QuoteCount]: `tweets.quote_count desc`,
  [TweetsSort.LikeCount]: `tweets.like_count desc`,
  [TweetsSort.FollowerCount]: `users.followers_count desc`,
  [TweetsSort.Latest]: `tweets.created_at desc`,
  [TweetsSort.Earliest]: `tweets.created_at asc`,
};
const ARTICLES_ORDER_BY: Record<ArticlesSort, string> = {
  [ArticlesSort.TweetCount]: `count(tweets)`,
  [ArticlesSort.AttentionScore]: `attention_score`,
};

export async function getTweetsByIds(
  tweetIds: bigint[],
  uid?: bigint
): Promise<TweetFull[]> {
  /* prettier-ignore */
  return swr<TweetFull>(`
    select
      tweets.*,
      ${uid ? `likes is not null as liked,` : ''}
      ${uid ? `retweets is not null as retweeted,` : ''}
      to_json(users.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
      ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join users on users.id = tweets.author_id
      ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
    where tweets.id in (${tweetIds.join()})
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by created_at desc;`, uid);
}

export async function getTweetRepliesByIds(
  tweetIds: bigint[],
  uid?: bigint
): Promise<TweetFull[]> {
  /* prettier-ignore */
  return swr<TweetFull>(`
    select
      tweets.*,
      ${uid ? `likes is not null as liked,` : ''}
      ${uid ? `retweets is not null as retweeted,` : ''}
      to_json(users.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
      ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join users on users.id = tweets.author_id
      inner join refs replies on replies.referencer_tweet_id = tweets.id and replies.referenced_tweet_id in (${tweetIds.join()}) and replies.type = 'replied_to'
      ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by created_at desc;`, uid);
}

export function getListTweetsQuery(
  listId: bigint,
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
) {
  /* prettier-ignore */
  return `
    select
      tweets.*,
      ${uid ? `likes is not null as liked,` : ''}
      ${uid ? `retweets is not null as retweeted,` : ''}
      to_json(users.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
      ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join users on users.id = tweets.author_id
      inner join list_members on list_members.user_id = tweets.author_id and list_members.list_id = ${listId}
      ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
    where ${TWEETS_TIMES[time]}
    ${filter === TweetsFilter.HideRetweets ? `and refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getListTweets(
  listId: bigint,
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getListTweetsQuery(listId, sort, filter, time, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for list (${listId}).`);
  return tweets;
}

export function getClusterTweetsQuery(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
) {
  /* prettier-ignore */
  return `
    select
      tweets.*,
      ${uid ? `likes is not null as liked,` : ''}
      ${uid ? `retweets is not null as retweeted,` : ''}
      to_json(users.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
      ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join users on users.id = tweets.author_id
      inner join scores on scores.user_id = tweets.author_id
      inner join clusters on clusters.id = scores.cluster_id and clusters.slug = '${clusterSlug}'      
      ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
    where ${TWEETS_TIMES[time]}
    ${filter === TweetsFilter.HideRetweets ? `and refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getClusterTweets(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getClusterTweetsQuery(clusterSlug, sort, filter, time, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for cluster (${clusterSlug}).`);
  return tweets;
}

export function getRektTweetsQuery(
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
) {
  /* prettier-ignore */
  return `
    select
      tweets.*,
      ${uid ? `likes is not null as liked,` : ''}
      ${uid ? `retweets is not null as retweeted,` : ''}
      to_json(users.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
      ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join users on users.id = tweets.author_id
      inner join rekt on rekt.user_id = users.id
      ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
      ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
    where ${TWEETS_TIMES[time]}
    ${filter === TweetsFilter.HideRetweets ? `and refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getRektTweets(
  sort: TweetsSort,
  filter: TweetsFilter,
  time = DEFAULT_TIME,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getRektTweetsQuery(sort, filter, time, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for Rekt.`);
  return tweets;
}

export function getListsQuery(uid: bigint): string {
  return `
    select lists.* from lists
    left outer join list_followers on list_followers.list_id = lists.id
    where lists.owner_id = ${uid} 
    or list_followers.user_id = ${uid}
    `;
}
export async function getLists(uid: bigint): Promise<List[]> {
  return swr<List>(getListsQuery(uid), uid);
}

export function getListArticlesQuery(
  listId: bigint,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  time = DEFAULT_TIME,
  uid?: bigint
): string {
  /* prettier-ignore */
  return `
    select
      links.*,
      json_agg(tweets.*) as tweets
    from links
      inner join (
        select distinct on (urls.link_url, tweets.author_id)
          urls.link_url as link_url,
          tweets.*
        from urls
          inner join (
            select
              tweets.*,
              ${uid ? `likes is not null as liked,` : ''}
              ${uid ? `retweets is not null as retweeted,` : ''}
              to_json(users.*) as author,
              json_agg(refs.*) as refs,
              array_agg(refs.referenced_tweet_id) as ref_ids,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
              ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join users on users.id = tweets.author_id
              inner join list_members on list_members.user_id = tweets.author_id and list_members.list_id = ${listId}
              ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
              left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type != 'replied_to'
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
            where ${TWEETS_TIMES[time]}
            ${filter === ArticlesFilter.HideRetweets ? `and (refs is null or 'retweeted' not in (refs.type))` : ''}
            group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
          ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by count(tweets) desc
    limit 50;`;
}
export async function getListArticles(
  listId: bigint,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  time = DEFAULT_TIME,
  uid?: bigint
): Promise<ArticleFull[]> {
  const articles = await swr<ArticleFull>(
    getListArticlesQuery(listId, sort, filter, time, uid),
    uid
  );
  log.trace(`Fetched ${articles.length} articles for list (${listId}).`);
  return articles;
}

export function getClusterArticlesQuery(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  time = DEFAULT_TIME,
  uid?: bigint
): string {
  /* prettier-ignore */
  return `
    select
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
              ${uid ? `likes is not null as liked,` : ''}
              ${uid ? `retweets is not null as retweeted,` : ''}
              to_json(users.*) as author,
              json_agg(refs.*) as refs,
              array_agg(refs.referenced_tweet_id) as ref_ids,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
              ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join users on users.id = tweets.author_id
              inner join scores on scores.user_id = tweets.author_id
              inner join clusters on clusters.id = scores.cluster_id and clusters.slug = '${clusterSlug}'
              ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
              left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type != 'replied_to'
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
            where ${TWEETS_TIMES[time]}
            ${filter === ArticlesFilter.HideRetweets ? `and (refs is null or 'retweeted' not in (refs.type))` : ''}
            group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}scores.id,users.id
          ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by ${ARTICLES_ORDER_BY[sort]} desc
    limit 50;`;
}
export async function getClusterArticles(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  time = DEFAULT_TIME,
  uid?: bigint
): Promise<ArticleFull[]> {
  const articles = await swr<ArticleFull>(
    getClusterArticlesQuery(clusterSlug, sort, filter, time, uid),
    uid
  );
  log.trace(
    `Fetched ${articles.length} articles for cluster (${clusterSlug}).`
  );
  return articles;
}

export function getRektArticlesQuery(
  time = DEFAULT_TIME,
  uid?: bigint
): string {
  /* prettier-ignore */
  return `
    select
      links.*,
      sum(tweets.points) as points,
      json_agg(tweets.*) as tweets
    from links
      inner join (
        select distinct on (urls.link_url, tweets.author_id)
          urls.link_url as link_url,
          tweets.*
        from urls
          inner join (
            select
              tweets.*,
              rekt.points as points,
              to_json(rekt.*) as rekt,
              ${uid ? `likes is not null as liked,` : ''}
              ${uid ? `retweets is not null as retweeted,` : ''}
              to_json(users.*) as author,
              json_agg(refs.*) as refs,
              array_agg(refs.referenced_tweet_id) as ref_ids,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? `json_agg(ref_likes.*) as ref_likes,` : ''}
              ${uid ? `json_agg(ref_retweets.*) as ref_retweets,` : ''}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join users on users.id = tweets.author_id
              inner join rekt on rekt.user_id = tweets.author_id
              ${uid ? `left outer join likes on likes.tweet_id = tweets.id and likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets on retweets.tweet_id = tweets.id and retweets.user_id = ${uid}` : ''}
              left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type != 'replied_to'
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join users ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? `left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.user_id = ${uid}` : ''}
              ${uid ? `left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.user_id = ${uid}` : ''}
            where ${TWEETS_TIMES[time]} and (refs is null or 'retweeted' not in (refs.type))
            group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}rekt.id,users.id
          ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
      ) as tweets on tweets.link_url = links.url
    where links.url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by points desc
    limit 50;`
}
export async function getRektArticles(
  time = DEFAULT_TIME,
  uid?: bigint
): Promise<ArticleFull[]> {
  const articles = await swr<ArticleFull>(getRektArticlesQuery(time, uid), uid);
  log.trace(`Fetched ${articles.length} articles for Rekt.`);
  return articles;
}
