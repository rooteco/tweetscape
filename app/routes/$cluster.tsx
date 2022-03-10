import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { lang, log } from '~/utils.server';
import type { Article } from '~/db.server';
import ArticleItem from '~/components/article';
import { cluster } from '~/cookies.server';
import { pool } from '~/db.server';

export type LoaderData = { articles: Article[]; locale: string };

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<LoaderData> => {
  invariant(params.cluster, 'expected params.cluster');
  log.info(`Fetching articles for ${params.cluster}...`);
  const data = await pool.query(
    `
      select * from articles 
      where cluster_slug = '${params.cluster}'
      and expanded_url !~ '^https?:\\/\\/twitter\\.com' 
      order by attention_score desc
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
  return (
    <main>
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
