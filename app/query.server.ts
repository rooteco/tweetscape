import { autoLink } from 'twitter-text';

import type { Article, InfluencerFull, List, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_TWEETS_LIMIT,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { revalidate, swr } from '~/swr.server';
import { Prisma } from '~/db.server';
import { log } from '~/utils.server';

const TWEETS_ORDER_BY: Record<TweetsSort, Prisma.Sql> = {
  [TweetsSort.TweetCount]: Prisma.sql`(tweets.retweet_count + tweets.quote_count) desc`,
  [TweetsSort.RetweetCount]: Prisma.sql`tweets.retweet_count desc`,
  [TweetsSort.QuoteCount]: Prisma.sql`tweets.quote_count desc`,
  [TweetsSort.LikeCount]: Prisma.sql`tweets.like_count desc`,
  [TweetsSort.FollowerCount]: Prisma.sql`influencers.followers_count desc`,
  [TweetsSort.Latest]: Prisma.sql`tweets.created_at desc`,
  [TweetsSort.Earliest]: Prisma.sql`tweets.created_at asc`,
};
const ARTICLES_ORDER_BY: Record<ArticlesSort, Prisma.Sql> = {
  [ArticlesSort.TweetCount]: Prisma.sql`count(tweets)`,
  [ArticlesSort.AttentionScore]: Prisma.sql`attention_score`,
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
function getInfluencerFull(influencer: InfluencerFull): InfluencerFull {
  return { ...influencer, html: html(influencer.description ?? '') };
}
function getTweetFull(tweet: TweetFull): TweetFull {
  return {
    ...tweet,
    html: html(tweet.text),
    author: tweet.author ? getInfluencerFull(tweet.author) : undefined,
    ref_tweets: tweet.ref_tweets?.map((t) => (t ? getTweetFull(t) : t)),
    ref_authors: tweet.ref_authors?.map((a) => (a ? getInfluencerFull(a) : a)),
  };
}
function getTweetsFull(tweets: TweetFull[]): TweetFull[] {
  return tweets.map(getTweetFull);
}
function getArticlesFull(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    tweets: getTweetsFull(article.tweets),
  }));
}

export async function getTweetsByIds(
  tweetIds: string[],
  uid?: string
): Promise<TweetFull[]> {
  /* prettier-ignore */
  const tweets = await swr<TweetFull>(Prisma.sql`
    select
      tweets.*,
      ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
      ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
      to_json(influencers.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
      ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
    where tweets.id in (${Prisma.join(tweetIds)})
    group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
    order by created_at desc;`);
  return getTweetsFull(tweets);
}

export async function getTweetRepliesByIds(
  tweetIds: string[],
  uid?: string
): Promise<TweetFull[]> {
  /* prettier-ignore */
  const tweets = await swr<TweetFull>(Prisma.sql`
    select
      tweets.*,
      ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
      ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
      to_json(influencers.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
      ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join refs replies on replies.referencer_tweet_id = tweets.id and replies.referenced_tweet_id in (${Prisma.join(tweetIds)}) and replies.type = 'replied_to'
      ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
    group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
    order by created_at desc;`);
  return getTweetsFull(tweets);
}

function getListTweetsQuery(
  listId: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
) {
  /* prettier-ignore */
  return Prisma.sql`
    select
      tweets.*,
      ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
      ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
      to_json(influencers.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
      ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join list_members on list_members.influencer_id = tweets.author_id and list_members.list_id = ${listId}
      ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
    ${filter === TweetsFilter.HideRetweets ? Prisma.sql`where refs is null` : Prisma.empty}
    group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getListTweets(
  listId: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort].sql}...`);
  const tweets = await swr<TweetFull>(
    getListTweetsQuery(listId, sort, filter, limit, uid)
  );
  log.trace(`Fetched ${tweets.length} tweets for list (${listId}).`);
  return getTweetsFull(tweets);
}
export function revalidateListTweets(
  listId: string,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
) {
  log.debug(`Revalidating list (${listId}) tweets...`);
  const promises = Object.values(TweetsSort).map((sort) => {
    if (typeof sort === 'string') return;
    return Object.values(TweetsFilter).map((filter) => {
      if (typeof filter === 'string') return;
      return revalidate(getListTweetsQuery(listId, sort, filter, limit, uid));
    });
  });
  return Promise.all(promises.flat());
}

function getClusterTweetsQuery(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
) {
  /* prettier-ignore */
  return Prisma.sql`
    select
      tweets.*,
      ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
      ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
      to_json(influencers.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
      ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join scores on scores.influencer_id = tweets.author_id
      inner join clusters on clusters.id = scores.cluster_id and clusters.slug = ${clusterSlug}      
      ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
    ${filter === TweetsFilter.HideRetweets ? Prisma.sql`where refs is null` : Prisma.empty}
    group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getClusterTweets(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort].sql}...`);
  const tweets = await swr<TweetFull>(
    getClusterTweetsQuery(clusterSlug, sort, filter, limit, uid)
  );
  log.trace(`Fetched ${tweets.length} tweets for cluster (${clusterSlug}).`);
  return getTweetsFull(tweets);
}

function getRektTweetsQuery(
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
) {
  /* prettier-ignore */
  return Prisma.sql`
    select
      tweets.*,
      ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
      ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
      to_json(influencers.*) as author,
      json_agg(refs.*) as refs,
      json_agg(ref_tweets.*) as ref_tweets,
      ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
      ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
      json_agg(ref_authors.*) as ref_authors
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join rekt on rekt.influencer_id = influencers.id
      ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
      left outer join refs on refs.referencer_tweet_id = tweets.id
      left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
      left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
      ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
      ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
    ${filter === TweetsFilter.HideRetweets ? Prisma.sql`where refs is null` : Prisma.empty}
    group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`;
}
export async function getRektTweets(
  sort: TweetsSort,
  filter: TweetsFilter,
  limit = DEFAULT_TWEETS_LIMIT,
  uid?: string
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort].sql}...`);
  const tweets = await swr<TweetFull>(
    getRektTweetsQuery(sort, filter, limit, uid)
  );
  log.trace(`Fetched ${tweets.length} tweets for Rekt.`);
  return getTweetsFull(tweets);
}

function getListsQuery(uid: string): Prisma.Sql {
  return Prisma.sql`
    select lists.* from lists
    left outer join list_followers on list_followers.list_id = lists.id
    where lists.owner_id = ${uid} or list_followers.influencer_id = ${uid}
    `;
}
export const getLists = (uid: string) => swr<List>(getListsQuery(uid));
export const revalidateLists = (uid: string) => revalidate(getListsQuery(uid));

function getListArticlesQuery(
  listId: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  uid?: string
): Prisma.Sql {
  /* prettier-ignore */
  return Prisma.sql`
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
              ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
              ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
              to_json(influencers.*) as author,
              json_agg(refs.*) as refs,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
              ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join list_members on list_members.influencer_id = tweets.author_id and list_members.list_id = ${listId}
              ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
              left outer join refs on refs.referencer_tweet_id = tweets.id
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
            ${filter === ArticlesFilter.HideRetweets ? Prisma.sql`where refs is null` : Prisma.empty}
            group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by count(tweets) desc
    limit 50;`;
}
export async function getListArticles(
  listId: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  uid?: string
): Promise<Article[]> {
  const articles = await swr<Article>(
    getListArticlesQuery(listId, sort, filter, uid)
  );
  log.trace(`Fetched ${articles.length} articles for list (${listId}).`);
  return getArticlesFull(articles);
}
export function revalidateListArticles(listId: string) {
  log.debug(`Revalidating list (${listId}) articles...`);
  const promises = Object.values(ArticlesSort).map((sort) => {
    if (typeof sort === 'string') return;
    return Object.values(ArticlesFilter).map((filter) => {
      if (typeof filter === 'string') return;
      return revalidate(getListArticlesQuery(listId, sort, filter));
    });
  });
  return Promise.all(promises.flat());
}

function getClusterArticlesQuery(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter,
  uid?: string
): Prisma.Sql {
  /* prettier-ignore */
  return Prisma.sql`
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
              ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
              ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
              to_json(influencers.*) as author,
              json_agg(refs.*) as refs,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
              ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join scores on scores.influencer_id = tweets.author_id
              inner join clusters on clusters.id = scores.cluster_id and clusters.slug = ${clusterSlug}
              ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
              left outer join refs on refs.referencer_tweet_id = tweets.id
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
            group by tweets.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}scores.id,influencers.id
            ${filter === ArticlesFilter.HideRetweets ? Prisma.sql`where refs is null` : Prisma.empty}
          ) as tweets on tweets.id = urls.tweet_id
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
  uid?: string
): Promise<Article[]> {
  const articles = await swr<Article>(
    getClusterArticlesQuery(clusterSlug, sort, filter, uid)
  );
  log.trace(
    `Fetched ${articles.length} articles for cluster (${clusterSlug}).`
  );
  return getArticlesFull(articles);
}

function getRektArticlesQuery(uid?: string): Prisma.Sql {
  /* prettier-ignore */
  return Prisma.sql`
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
              ${uid ? Prisma.sql`likes is not null as liked,` : Prisma.empty}
              ${uid ? Prisma.sql`retweets is not null as retweeted,` : Prisma.empty}
              to_json(influencers.*) as author,
              quotes.referenced_tweet_id as quote_id,
              json_agg(refs.*) as refs,
              json_agg(ref_tweets.*) as ref_tweets,
              ${uid ? Prisma.sql`json_agg(ref_likes.*) as ref_likes,` : Prisma.empty}
              ${uid ? Prisma.sql`json_agg(ref_retweets.*) as ref_retweets,` : Prisma.empty}
              json_agg(ref_authors.*) as ref_authors
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join rekt on rekt.influencer_id = tweets.author_id
              ${uid ? Prisma.sql`left outer join likes on likes.tweet_id = tweets.id and likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets on retweets.tweet_id = tweets.id and retweets.influencer_id = ${uid}` : Prisma.empty}
              left outer join refs quotes on quotes.referencer_tweet_id = tweets.id and quotes.type = 'quoted'
              left outer join refs retweet on retweet.referencer_tweet_id = tweets.id and retweet.type = 'retweeted'
              left outer join refs on refs.referencer_tweet_id = tweets.id
              left outer join tweets ref_tweets on ref_tweets.id = refs.referenced_tweet_id
              left outer join influencers ref_authors on ref_authors.id = ref_tweets.author_id
              ${uid ? Prisma.sql`left outer join likes ref_likes on ref_likes.tweet_id = refs.referenced_tweet_id and ref_likes.influencer_id = ${uid}` : Prisma.empty}
              ${uid ? Prisma.sql`left outer join retweets ref_retweets on ref_retweets.tweet_id = refs.referenced_tweet_id and ref_retweets.influencer_id = ${uid}` : Prisma.empty}
            where retweet is null
            group by tweets.id,quotes.referenced_tweet_id,rekt.id,${uid ? Prisma.sql`likes.*,retweets.*,` : Prisma.empty}influencers.id
          ) as tweets on urls.tweet_id in (tweets.id, tweets.quote_id)
      ) as tweets on tweets.link_url = links.url
    where links.url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by points desc
    limit 50;`
}
export async function getRektArticles(uid?: string): Promise<Article[]> {
  const articles = await swr<Article>(getRektArticlesQuery(uid));
  log.trace(`Fetched ${articles.length} articles for Rekt.`);
  return getArticlesFull(articles);
}
