import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import { commitSession, getSession } from '~/session.server';
import { lang, log } from '~/utils.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import type { Filter } from '~/articles.server';
import Nav from '~/components/nav';
import OAuth from '~/components/oauth';
import { getListArticles } from '~/articles.server';

export type LoaderData = { articles: Article[]; locale: string };

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for list (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const filter = (url.searchParams.get('filter') ?? 'hide_retweets') as Filter;
  const articles = await getListArticles(params.id, filter);
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
      <OAuth />
      <Nav />
      <ol className='text-sm'>
        {!articles.length && <Empty>no articles to show</Empty>}
        {articles.map((a) => (
          <ArticleItem {...a} key={Number(a.id)} />
        ))}
      </ol>
    </main>
  );
}
