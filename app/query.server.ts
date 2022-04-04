import { autoLink } from 'twitter-text';

import type {
  Article,
  Like,
  List,
  Ref,
  Retweet,
  TweetFull,
  UserFull,
} from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_TWEETS_LIMIT,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { log } from '~/utils.server';
import { swr } from '~/swr.server';

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

function html(text: string): string {
  return autoLink(text, {
    usernameIncludeSymbol: true,
    linkAttributeBlock(entity, attrs) {
      attrs.target = '_blank';
      attrs.rel = 'noopener noreferrer';
      attrs.class = 'hover:underline dark:text-sky-400 text-sky-500';
    },
  });
}
function wrapRef(ref: Ref): Ref {
  return {
    ...ref,
    referencer_tweet_id: BigInt(ref.referencer_tweet_id),
    referenced_tweet_id: BigInt(ref.referenced_tweet_id),
  };
}
function wrapRelation(relation: Like | Retweet): Like | Retweet {
  return {
    user_id: BigInt(relation.user_id),
    tweet_id: BigInt(relation.tweet_id),
  };
}
function wrapUser(user: UserFull): UserFull {
  return { ...user, html: html(user.description ?? ''), id: BigInt(user.id) };
}
function wrapTweet(tweet: TweetFull): TweetFull {
  return {
    ...tweet,
    html: html(tweet.text),
    author: tweet.author ? wrapUser(tweet.author) : undefined,
    refs: tweet.refs?.map((r) => (r ? wrapRef(r) : r)),
    ref_tweets: tweet.ref_tweets?.map((t) => (t ? wrapTweet(t) : t)),
    ref_authors: tweet.ref_authors?.map((a) => (a ? wrapUser(a) : a)),
    ref_likes: tweet.ref_likes?.map((l) => (l ? wrapRelation(l) : l)),
    ref_retweets: tweet.ref_retweets?.map((r) => (r ? wrapRelation(r) : r)),
    id: BigInt(tweet.id),
    author_id: BigInt(tweet.author_id),
  };
}
function wrapTweets(tweets: TweetFull[]): TweetFull[] {
  return tweets.map(wrapTweet);
}
function wrapArticles(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    tweets: wrapTweets(article.tweets),
    cluster_id: article.cluster_id ? BigInt(article.cluster_id) : undefined,
  }));
}
function wrapLists(lists: List[]): List[] {
  return lists.map((list) => ({
    ...list,
    id: BigInt(list.id),
    owner_id: BigInt(list.owner_id),
  }));
}

export async function getTweetsByIds(
  tweetIds: bigint[],
  uid?: bigint
): Promise<TweetFull[]> {
  /* prettier-ignore */
  const tweets = await swr<TweetFull>(`
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
  return wrapTweets(tweets);
}

export async function getTweetRepliesByIds(
  tweetIds: bigint[],
  uid?: bigint
): Promise<TweetFull[]> {
  /* prettier-ignore */
  const tweets = await swr<TweetFull>(`
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
  return wrapTweets(tweets);
}

function getListTweetsQuery(
  listId: bigint,
  sort: TweetsSort,
  filter: TweetsFilter,
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
    ${filter === TweetsFilter.HideRetweets ? `where refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getListTweets(
  listId: bigint,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getListTweetsQuery(listId, sort, filter, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for list (${listId}).`);
  return wrapTweets(tweets);
}

function getClusterTweetsQuery(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
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
    ${filter === TweetsFilter.HideRetweets ? `where refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getClusterTweets(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getClusterTweetsQuery(clusterSlug, sort, filter, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for cluster (${clusterSlug}).`);
  return wrapTweets(tweets);
}

function getRektTweetsQuery(
  sort: TweetsSort,
  filter: TweetsFilter,
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
    ${filter === TweetsFilter.HideRetweets ? `where refs is null` : ''}
    group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}users.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getRektTweets(
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort]}...`);
  const tweets = await swr<TweetFull>(
    getRektTweetsQuery(sort, filter, limit, uid),
    uid
  );
  log.trace(`Fetched ${tweets.length} tweets for Rekt.`);
  return wrapTweets(tweets);
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
  const lists = await swr<List>(getListsQuery(uid), uid);
  return wrapLists(lists);
}

function getListArticlesQuery(
  listId: bigint,
  sort: ArticlesSort,
  filter: ArticlesFilter,
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
            ${filter === ArticlesFilter.HideRetweets ? `where refs is null or 'retweeted' not in (refs.type)` : ''}
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
  uid?: bigint
): Promise<Article[]> {
  const articles = await swr<Article>(
    getListArticlesQuery(listId, sort, filter, uid),
    uid
  );
  log.trace(`Fetched ${articles.length} articles for list (${listId}).`);
  return wrapArticles(articles);
}

function getClusterArticlesQuery(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
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
            ${filter === ArticlesFilter.HideRetweets ? `where refs is null or 'retweeted' not in (refs.type)` : ''}
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
  uid?: bigint
): Promise<Article[]> {
  const articles = await swr<Article>(
    getClusterArticlesQuery(clusterSlug, sort, filter, uid),
    uid
  );
  log.trace(
    `Fetched ${articles.length} articles for cluster (${clusterSlug}).`
  );
  return wrapArticles(articles);
}

function getRektArticlesQuery(uid?: bigint): string {
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
            where refs is null or 'retweeted' not in (refs.type)
            group by tweets.id,${uid ? `likes.*,retweets.*,` : ''}rekt.id,users.id
          ) as tweets on tweets.id = urls.tweet_id or urls.tweet_id = any (tweets.ref_ids)
      ) as tweets on tweets.link_url = links.url
    where links.url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by points desc
    limit 50;`
}
export async function getRektArticles(uid?: bigint): Promise<Article[]> {
  const articles = await swr<Article>(getRektArticlesQuery(uid), uid);
  log.trace(`Fetched ${articles.length} articles for Rekt.`);
  return wrapArticles(articles);
}
