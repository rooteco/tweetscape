import { Link, json, useLoaderData, useSearchParams } from 'remix';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import { lang, log } from '~/utils.server';
import type { Article } from '~/db.server';
import ArticleItem from '~/components/article';
import { cluster } from '~/cookies.server';
import { pool } from '~/db.server';

export type LoaderData = { articles: Article[]; locale: string };
export type Sort = 'attention_score' | 'tweets_count';

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<LoaderData> => {
  invariant(params.cluster, 'expected params.cluster');
  log.info(`Fetching articles for ${params.cluster}...`);
  const url = new URL(request.url);
  const sort = (url.searchParams.get('sort') as Sort) ?? 'attention_score';
  const data = await pool.query(
    `
      select * from articles 
      where cluster_slug = '${params.cluster}'
      and expanded_url !~ '^https?:\\/\\/twitter\\.com' 
      order by ${
        sort === 'tweets_count' ? 'json_array_length(tweets)' : sort
      } desc
      limit 20;
      `
  );
  log.trace(`Articles: ${JSON.stringify(data, null, 2)}`);
  log.info(`Fetched ${data.rows.length} articles for ${params.cluster}.`);
  return json(
    { articles: data.rows as Article[], locale: lang(request) },
    { headers: { 'Set-Cookie': await cluster.serialize(params.cluster) } }
  );
};

export default function Cluster() {
  const { articles } = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const sort = searchParams.get('sort');
  return (
    <main>
      <nav className='text-xs mt-2'>
        <svg
          className='fill-current h-4 w-4 mr-1.5 inline-block'
          xmlns='http://www.w3.org/2000/svg'
          height='24'
          viewBox='0 0 24 24'
          width='24'
        >
          <path d='M0 0h24v24H0z' fill='none' />
          <path d='M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z' />
        </svg>
        <Link
          className={cn({ underline: !sort || sort === 'attention_score' })}
          to='?sort=attention_score'
        >
          attention score
        </Link>
        {' · '}
        <Link
          className={cn({ underline: sort === 'tweets_count' })}
          to='?sort=tweets_count'
        >
          tweets count
        </Link>
      </nav>
      <ol className='text-sm'>
        {!articles.length && (
          <div className='border uppercase rounded text-slate-400 border-slate-300 dark:text-slate-600 dark:border-slate-700 border-dashed text-center font-normal p-6 my-12 flex items-center justify-center min-h-[95vh]'>
            no articles to show
          </div>
        )}
        {articles.map((a) => (
          <ArticleItem {...a} key={a.id} />
        ))}
      </ol>
    </main>
  );
}
