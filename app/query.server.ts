import { autoLink } from 'twitter-text';

import type { Article, List, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { Prisma, db } from '~/db.server';
import { revalidate, swr } from '~/swr.server';
import { log } from '~/utils.server';

const TWEETS_ORDER_BY: Record<TweetsSort, Prisma.Sql> = {
  [TweetsSort.TweetCount]: Prisma.sql`(retweet_count + quote_count) desc`,
  [TweetsSort.RetweetCount]: Prisma.sql`retweet_count desc`,
  [TweetsSort.QuoteCount]: Prisma.sql`quote_count desc`,
  [TweetsSort.LikeCount]: Prisma.sql`like_count desc`,
  [TweetsSort.FollowerCount]: Prisma.sql`influencers.followers_count desc`,
  [TweetsSort.Latest]: Prisma.sql`created_at desc`,
  [TweetsSort.Earliest]: Prisma.sql`created_at asc`,
};
const ARTICLES_ORDER_BY: Record<ArticlesSort, Prisma.Sql> = {
  [ArticlesSort.TweetCount]: Prisma.sql`count(tweets)`,
  [ArticlesSort.AttentionScore]: Prisma.sql`attention_score`,
};

function getTweetsFull(tweets: TweetFull[]): TweetFull[] {
  return tweets.map((tweet) => ({
    ...tweet,
    html: autoLink(tweet.text, {
      usernameIncludeSymbol: true,
      linkAttributeBlock(entity, attrs) {
        attrs.target = '_blank';
        attrs.rel = 'noopener noreferrer';
        attrs.class = 'hover:underline dark:text-sky-400 text-sky-500';
      },
    }),
    author: {
      ...tweet.author,
      html: autoLink(tweet.author.description ?? '', {
        usernameIncludeSymbol: true,
        linkAttributeBlock(entity, attrs) {
          attrs.target = '_blank';
          attrs.rel = 'noopener noreferrer';
          attrs.class = 'hover:underline dark:text-sky-400 text-sky-500';
        },
      }),
    },
  }));
}

export async function getListTweets(
  listId: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit: number
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort].sql}...`);
  /* prettier-ignore */
  const tweets = await db.$queryRaw<TweetFull[]>(Prisma.sql`
    select
      tweets.*,
      to_json(influencers.*) as author,
      to_json(retweets.*) as retweet,
      to_json(retweet_authors.*) as retweet_author
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join list_members on list_members.influencer_id = tweets.author_id
      left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted'
      left outer join tweets retweets on retweets.id = refs.referenced_tweet_id
      left outer join influencers retweet_authors on retweet_authors.id = retweets.author_id
    where list_members.list_id = ${listId}
    ${filter === TweetsFilter.HideRetweets ? Prisma.sql`and refs is null` : Prisma.empty}
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};`);
  log.info(`Fetched ${tweets.length} tweets for list (${listId}).`);
  return getTweetsFull(tweets);
}

export async function getClusterTweets(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter,
  limit: number
): Promise<TweetFull[]> {
  log.debug(`Ordering tweets by ${TWEETS_ORDER_BY[sort].sql}...`);
  /* prettier-ignore */
  const tweets = await db.$queryRaw<TweetFull[]>(Prisma.sql`
    select
      tweets.*,
      to_json(influencers.*) as author,
      to_json(retweets.*) as retweet,
      to_json(retweet_authors.*) as retweet_author
    from tweets
      inner join influencers on influencers.id = tweets.author_id
      inner join scores on scores.influencer_id = tweets.author_id
      inner join clusters on clusters.id = scores.cluster_id      
      left outer join refs on refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted'
      left outer join tweets retweets on retweets.id = refs.referenced_tweet_id
      left outer join influencers retweet_authors on retweet_authors.id = retweets.author_id
    where clusters.slug = ${clusterSlug}
    ${filter === TweetsFilter.HideRetweets ? Prisma.sql`and refs is null` : Prisma.empty}
    order by ${TWEETS_ORDER_BY[sort]}
    limit ${limit};
    `);
  log.info(`Fetched ${tweets.length} tweets for cluster (${clusterSlug}).`);
  return getTweetsFull(tweets);
}

function getArticlesFull(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    tweets: getTweetsFull(article.tweets),
  }));
}

export function getListsQuery(uid: string): Prisma.Sql {
  // TODO: Wrap the `uid` in some SQL injection avoidance mechanism as it's
  // very much possible that somebody smart and devious could:
  // a) find our cookie secret and encrypt their own (fake) session cookie;
  // b) set the session cookie `uid` to some malicious raw SQL;
  // c) have that SQL run here and mess up our production db.
  return Prisma.sql`
    select lists.* from lists
    left outer join list_followers on list_followers.list_id = lists.id
    where lists.owner_id = ${uid} or list_followers.influencer_id = ${uid}
    `;
}

export function getLists(uid: string): Promise<List[]> {
  return db.$queryRaw<List[]>(getListsQuery(uid));
}

export function getListArticlesQuery(
  listId: string,
  sort: ArticlesSort,
  filter: ArticlesFilter
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
              to_json(influencers.*) as author
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join list_members on list_members.influencer_id = influencers.id
            where list_members.list_id = ${listId}
            ${filter === ArticlesFilter.HideRetweets ? Prisma.sql`and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : Prisma.empty}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by count(tweets) desc
    limit 20;`;
}

export async function getListArticles(
  listId: string,
  sort: ArticlesSort,
  filter: ArticlesFilter
): Promise<Article[]> {
  const articles = await swr<Article>(
    getListArticlesQuery(listId, sort, filter)
  );
  log.info(`Fetched ${articles.length} articles for list (${listId}).`);
  return getArticlesFull(articles);
}

export function revalidateListsCache(listIds: string[]) {
  log.info('Revalidating SWR cache keys for new data...');
  return Promise.all(
    listIds
      .map((listId) =>
        Object.values(ArticlesSort).map((sort) => {
          if (typeof sort === 'string') return;
          return Object.values(ArticlesFilter).map((filter) => {
            if (typeof filter === 'string') return;
            return revalidate(getListArticlesQuery(listId, sort, filter));
          });
        })
      )
      .flat(2)
  );
}

export function getClusterArticlesQuery(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter
): Prisma.Sql {
  /* prettier-ignore */
  return Prisma.sql`
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
              to_json(influencers.*) as author,
              to_json(scores.*) as score
            from tweets
              inner join influencers on influencers.id = tweets.author_id
              inner join scores on scores.influencer_id = influencers.id
            ${filter === ArticlesFilter.HideRetweets ? Prisma.sql`where not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : Prisma.empty}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
      inner join clusters on clusters.id = tweets.cluster_id
    where clusters.slug = ${clusterSlug} and url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url, clusters.id
    order by ${ARTICLES_ORDER_BY[sort]} desc
    limit 20;`;
}

export async function getClusterArticles(
  clusterSlug: string,
  sort: ArticlesSort,
  filter: ArticlesFilter
): Promise<Article[]> {
  const articles = await swr<Article>(
    getClusterArticlesQuery(clusterSlug, sort, filter)
  );
  log.info(`Fetched ${articles.length} articles for cluster (${clusterSlug}).`);
  return getArticlesFull(articles);
}
