import { autoLink } from 'twitter-text';

import type { Article, List } from '~/types';
import { Filter, Sort } from '~/query';
import { revalidate, swr } from '~/swr.server';
import { log } from '~/utils.server';

export function getListsQuery(uid: string): string {
  // TODO: Wrap the `uid` in some SQL injection avoidance mechanism as it's
  // very much possible that somebody smart and devious could:
  // a) find our cookie secret and encrypt their own (fake) session cookie;
  // b) set the session cookie `uid` to some malicious raw SQL;
  // c) have that SQL run here and mess up our production db.
  return `
    select lists.* from lists
    left outer join list_followers on list_followers.list_id = lists.id
    where lists.owner_id = '${uid}' or list_followers.influencer_id = '${uid}'
    `;
}

export function getLists(uid: string): Promise<List[]> {
  return swr<List>(getListsQuery(uid));
}

export function getListArticlesQuery(listId: string, filter: Filter): string {
  /* prettier-ignore */
  return (
    `
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
            where list_members.list_id = '${listId}'
            ${filter === Filter.HideRetweets ? `and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by count(tweets) desc
    limit 20;
    `
  );
}

function getArticlesWithHTML(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    tweets: article.tweets.map((tweet) => ({
      ...tweet,
      html: autoLink(tweet.text, {
        usernameIncludeSymbol: true,
        linkAttributeBlock(entity, attrs) {
          attrs.target = '_blank';
          attrs.rel = 'noopener noreferrer';
          attrs.class = 'hover:underline dark:text-sky-400 text-sky-500';
        },
      }),
    })),
  }));
}

export async function getListArticles(
  listId: string,
  filter: Filter
): Promise<Article[]> {
  const articles = await swr<Article>(getListArticlesQuery(listId, filter));
  log.trace(`Articles: ${JSON.stringify(articles, null, 2)}`);
  log.info(`Fetched ${articles.length} articles for list (${listId}).`);
  return getArticlesWithHTML(articles);
}

export function revalidateListsCache(listIds: string[]) {
  log.info('Revalidating SWR cache keys for new data...');
  return Promise.all(
    listIds
      .map((listId) =>
        Object.values(Filter).map((filter) => {
          if (typeof filter === 'string') return;
          return revalidate(getListArticlesQuery(listId, filter));
        })
      )
      .flat()
  );
}

export function getClusterArticlesQuery(
  clusterSlug: string,
  filter: Filter,
  sort: Sort
): string {
  /* prettier-ignore */
  return (
    `
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
            ${filter === Filter.HideRetweets ? `where not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
      inner join clusters on clusters.id = tweets.cluster_id
    where clusters.slug = '${clusterSlug}' and url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url, clusters.id
    order by ${sort === Sort.TweetsCount ? 'count(tweets)' : 'attention_score'} desc
    limit 20;
    `
  );
}

export async function getClusterArticles(
  clusterSlug: string,
  filter: Filter,
  sort: Sort
): Promise<Article[]> {
  const articles = await swr<Article>(
    getClusterArticlesQuery(clusterSlug, filter, sort)
  );
  log.trace(`Articles: ${JSON.stringify(articles, null, 2)}`);
  log.info(`Fetched ${articles.length} articles for cluster (${clusterSlug}).`);
  return getArticlesWithHTML(articles);
}
