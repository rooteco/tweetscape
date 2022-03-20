import { autoLink } from 'twitter-text';

import type { Article } from '~/types';
import { log } from '~/utils.server';
import { swr } from '~/swr.server';

// TODO: Instead of exporting these types and constants, I should export enums.
export type Sort = 'attention_score' | 'tweets_count';
export type Filter = 'show_retweets' | 'hide_retweets';

export const SORTS: Sort[] = ['attention_score', 'tweets_count'];
export const FILTERS: Filter[] = ['show_retweets', 'hide_retweets'];

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
            ${filter === 'hide_retweets' ? `and not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
    where url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url
    order by count(tweets) desc
    limit 20;
    `
  );
}

export async function getListArticles(
  listId: string,
  filter: Filter
): Promise<Article[]> {
  const articles = await swr<Article>(getListArticlesQuery(listId, filter));
  log.trace(`Articles: ${JSON.stringify(articles, null, 2)}`);
  log.info(`Fetched ${articles.length} articles for list (${listId}).`);
  articles.forEach((article) =>
    article.tweets.forEach((tweet) => {
      tweet.html = autoLink(tweet.text, {
        linkAttributeBlock(entity, attrs) {
          attrs.target = '_blank';
          attrs.rel = 'noopener noreferrer';
          attrs.class = 'hover:underline';
        },
      });
    })
  );
  return articles;
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
            ${filter === 'hide_retweets' ? `where not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_url = links.url
      inner join clusters on clusters.id = tweets.cluster_id
    where clusters.slug = '${clusterSlug}' and url !~ '^https?:\\/\\/twitter\\.com'
    group by links.url, clusters.id
    order by ${sort === 'tweets_count' ? 'count(tweets)' : sort} desc
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
  articles.forEach((article) =>
    article.tweets.forEach((tweet) => {
      tweet.html = autoLink(tweet.text, {
        linkAttributeBlock(entity, attrs) {
          attrs.target = '_blank';
          attrs.rel = 'noopener noreferrer';
          attrs.class = 'hover:underline';
        },
      });
    })
  );
  return articles;
}
