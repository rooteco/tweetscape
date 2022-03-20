import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import type { Filter, Sort } from '~/articles.server';
import { commitSession, getSession } from '~/session.server';
import { lang, log } from '~/utils.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import Nav from '~/components/nav';
import { getClusterArticles } from '~/articles.server';
import { useError } from '~/error';

export type LoaderData = { articles: Article[]; locale: string };

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.slug, 'expected params.slug');
  log.info(`Fetching articles for cluster (${params.slug})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const sort = (url.searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (url.searchParams.get('filter') ?? 'hide_retweets') as Filter;
  const articles = await getClusterArticles(params.slug, filter, sort);
  return json<LoaderData>(
    { articles, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <main>
      <Nav />
      <Empty>
        <p>an unexpected runtime error occurred</p>
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
          <ArticleItem {...a} key={a.url} />
        ))}
      </ol>
    </main>
  );
}
