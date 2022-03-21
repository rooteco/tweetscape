import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { useRef } from 'react';

import { commitSession, getSession } from '~/session.server';
import { lang, log } from '~/utils.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import { DEFAULT_FILTER } from '~/query';
import Empty from '~/components/empty';
import type { Filter } from '~/query';
import Nav from '~/components/nav';
import { getListArticles } from '~/query.server';
import { useError } from '~/error';

export type LoaderData = { articles: Article[]; locale: string };

export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for list (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const filter = (url.searchParams.get('filter') ?? DEFAULT_FILTER) as Filter;
  const articles = await getListArticles(params.id, filter);
  return json<LoaderData>(
    { articles, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  const scrollerRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={scrollerRef}
        className='flex-none flex flex-col w-[40rem] border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={scrollerRef} />
        <Empty className='flex-1 m-5'>
          <p className='uppercase'>an unexpected runtime error occurred</p>
          <p>{error.message}</p>
        </Empty>
      </section>
      <section className='flex-1 h-full p-10'>
        <Empty className='w-full h-full'>
          <article className='max-w-md'>
            <p>COMING SOON</p>
            <p>
              Soon you’ll be able to explore threads, related content (from HN,
              Product Hunt, backlinks, etc), and more!
            </p>
          </article>
        </Empty>
      </section>
    </main>
  );
}

export default function Cluster() {
  const { articles } = useLoaderData<LoaderData>();
  const scrollerRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={scrollerRef}
        className='flex-none flex flex-col w-[40rem] border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={scrollerRef} />
        {!articles.length && (
          <Empty className='flex-1 m-5'>NO ARTICLES TO SHOW</Empty>
        )}
        {!!articles.length && (
          <ol>
            {articles.map((a) => (
              <ArticleItem {...a} key={a.url} />
            ))}
          </ol>
        )}
      </section>
      <section className='flex-1 h-full p-10'>
        <Empty className='w-full h-full'>
          <article className='max-w-md'>
            <p>COMING SOON</p>
            <p>
              Soon you’ll be able to explore threads, related content (from HN,
              Product Hunt, backlinks, etc), and more!
            </p>
          </article>
        </Empty>
      </section>
    </main>
  );
}
