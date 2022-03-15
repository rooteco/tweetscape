import { Link, json, useLoaderData, useSearchParams } from 'remix';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import { autoLink, lang, log } from '~/utils.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';
import { cluster } from '~/cookies.server';
import { db } from '~/db.server';

export type LoaderData = { articles: Article[]; locale: string };

type Sort = 'attention_score' | 'tweets_count';
type Filter = 'show_retweets' | 'hide_retweets';

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.cluster, 'expected params.cluster');
  log.info(`Fetching articles for ${params.cluster}...`);
  const url = new URL(request.url);
  const sort = (url.searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (url.searchParams.get('filter') ?? 'hide_retweets') as Filter;
  /* prettier-ignore */
  const data = await db(
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
  log.trace(`Articles: ${JSON.stringify(data, null, 2)}`);
  log.info(`Fetched ${data.rows.length} articles for ${params.cluster}.`);
  const articles = data.rows as Article[];
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
    { headers: { 'Set-Cookie': await cluster.serialize(params.cluster) } }
  );
};

export default function Cluster() {
  const { articles } = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const sort = (searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (searchParams.get('filter') ?? 'hide_retweets') as Filter;
  return (
    <main>
      <nav className='text-xs mt-2'>
        <SortIcon />
        <Link
          className={cn({ underline: sort === 'attention_score' })}
          to={`?filter=${filter}&sort=attention_score`}
        >
          attention score
        </Link>
        {' · '}
        <Link
          className={cn({ underline: sort === 'tweets_count' })}
          to={`?filter=${filter}&sort=tweets_count`}
        >
          tweets count
        </Link>
        <FilterIcon />
        <Link
          className={cn({ underline: filter === 'hide_retweets' })}
          to={`?filter=hide_retweets&sort=${sort}`}
        >
          hide retweets
        </Link>
        {' · '}
        <Link
          className={cn({ underline: filter === 'show_retweets' })}
          to={`?filter=show_retweets&sort=${sort}`}
        >
          show retweets
        </Link>
      </nav>
      <ol className='text-sm'>
        {!articles.length && <Empty>no articles to show</Empty>}
        {articles.map((a) => (
          <ArticleItem {...a} key={a.id} />
        ))}
      </ol>
    </main>
  );
}
