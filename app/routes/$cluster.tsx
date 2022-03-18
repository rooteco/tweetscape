import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { autoLink, lang, log } from '~/utils.server';
import { commitSession, getSession } from '~/session.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import Nav from '~/components/nav';
import { redis } from '~/redis.server';

export type LoaderData = { articles: Article[]; locale: string };

export type Sort = 'attention_score' | 'tweets_count';
export type Filter = 'show_retweets' | 'hide_retweets';

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.cluster, 'expected params.cluster');
  log.info(`Fetching articles for ${params.cluster}...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const sort = (url.searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (url.searchParams.get('filter') ?? 'hide_retweets') as Filter;
  /* prettier-ignore */
  const articles = await redis<Article>(
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
        select distinct on (urls.link_id, tweets.author_id, tweets.cluster_id)
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
            ${filter === 'hide_retweets' ? `where not exists (select 1 from refs where refs.referencer_tweet_id = tweets.id and refs.type = 'retweeted')` : ''}
          ) as tweets on tweets.id = urls.tweet_id
      ) as tweets on tweets.link_id = links.id
      inner join clusters on clusters.id = tweets.cluster_id
    where clusters.slug = '${params.cluster}' and expanded_url !~ '^https?:\\/\\/twitter\\.com'
    group by links.id, clusters.id
    order by ${sort === 'tweets_count' ? 'count(tweets)' : sort} desc
    limit 20;
    `
  );
  log.trace(`Articles: ${JSON.stringify(articles, null, 2)}`);
  log.info(`Fetched ${articles.length} articles for ${params.cluster}.`);
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
  return json<LoaderData>(
    { articles, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <main>
      <Nav />
      <Empty>
        <p>an unexpected runtime error ocurred</p>
        <p>{error.message}</p>
      </Empty>
    </main>
  );
}

export default function Cluster() {
  const { articles } = useLoaderData<LoaderData>();
  return (
    <main>
      <Nav />
      <ol className='text-sm'>
        {!articles.length && <Empty>no articles to show</Empty>}
        {articles.map((a) => (
          <ArticleItem {...a} key={a.id} />
        ))}
      </ol>
    </main>
  );
}
