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

function getTweetsWithHTML(tweets: TweetFull[]): TweetFull[] {
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
  }));
}

function getArticlesWithHTML(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    tweets: getTweetsWithHTML(article.tweets),
  }));
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
  return getArticlesWithHTML(articles);
}

export async function getListTweets(
  listId: string,
  sort: TweetsSort,
  filter: TweetsFilter
): Promise<TweetFull[]> {
  const orderBy: Record<TweetsSort, Prisma.Sql> = {
    [TweetsSort.TweetCount]: Prisma.sql`(retweet_count + quote_count) desc`,
    [TweetsSort.RetweetCount]: Prisma.sql`retweet_count desc`,
    [TweetsSort.QuoteCount]: Prisma.sql`quote_count desc`,
    [TweetsSort.LikeCount]: Prisma.sql`like_count desc`,
    [TweetsSort.FollowerCount]: Prisma.sql`influencers.followers_count desc`,
    [TweetsSort.Latest]: Prisma.sql`created_at desc`,
    [TweetsSort.Earliest]: Prisma.sql`created_at asc`,
  };
  log.debug(`Ordering tweets by ${orderBy[sort].sql}...`);
  const tweets = await db.$queryRaw<TweetFull[]>(Prisma.sql`
    select tweets.*, to_json(influencers.*) as author from tweets
    inner join influencers on influencers.id = tweets.author_id
    inner join list_members on list_members.influencer_id = tweets.author_id
    where list_members.list_id = ${listId}
    ${
      filter === TweetsFilter.HideRetweets
        ? Prisma.sql`and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')`
        : Prisma.empty
    }
    order by ${orderBy[sort]}
    limit 50;`);
  log.info(`Fetched ${tweets.length} tweets for list (${listId}).`);
  return getTweetsWithHTML(tweets);
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
    order by ${sort === ArticlesSort.TweetCount ? Prisma.sql`count(tweets)` : Prisma.sql`attention_score`} desc
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
  return getArticlesWithHTML(articles);
}

export async function getClusterTweets(
  clusterSlug: string,
  sort: TweetsSort,
  filter: TweetsFilter
): Promise<TweetFull[]> {
  const orderBy: Record<TweetsSort, Prisma.Sql> = {
    [TweetsSort.TweetCount]: Prisma.sql`(retweet_count + quote_count) desc`,
    [TweetsSort.RetweetCount]: Prisma.sql`retweet_count desc`,
    [TweetsSort.QuoteCount]: Prisma.sql`quote_count desc`,
    [TweetsSort.LikeCount]: Prisma.sql`like_count desc`,
    [TweetsSort.FollowerCount]: Prisma.sql`influencers.followers_count desc`,
    [TweetsSort.Latest]: Prisma.sql`created_at desc`,
    [TweetsSort.Earliest]: Prisma.sql`created_at asc`,
  };
  log.debug(`Ordering tweets by ${orderBy[sort].sql}...`);
  const tweets = await db.$queryRaw<TweetFull[]>(Prisma.sql`
    select tweets.*, to_json(influencers.*) as author from tweets
    inner join influencers on influencers.id = tweets.author_id
    inner join scores on scores.influencer_id = tweets.author_id
    inner join clusters on clusters.id = scores.cluster_id
    where clusters.slug = ${clusterSlug}
    ${
      filter === TweetsFilter.HideRetweets
        ? Prisma.sql`and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')`
        : Prisma.empty
    }
    order by ${orderBy[sort]}
    limit 50;
    `);
  log.info(`Fetched ${tweets.length} tweets for cluster (${clusterSlug}).`);
  return getTweetsWithHTML(tweets);
}
