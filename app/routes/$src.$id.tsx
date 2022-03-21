import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { useRef } from 'react';

import type { Article, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLE_FILTER,
  DEFAULT_ARTICLE_SORT,
} from '~/query';
import { commitSession, getSession } from '~/session.server';
import {
  getClusterArticles,
  getClusterTweets,
  getListArticles,
  getListTweets,
} from '~/query.server';
import { lang, log } from '~/utils.server';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import Nav from '~/components/nav';
import TweetItem from '~/components/tweet';
import { useError } from '~/error';

export type LoaderData = {
  tweets: TweetFull[];
  articles: Article[];
  locale: string;
};

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles and tweets for ${params.src} (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const sort = Number(
    url.searchParams.get('sort') ?? DEFAULT_ARTICLE_SORT
  ) as ArticlesSort;
  const filter = Number(
    url.searchParams.get('filter') ?? DEFAULT_ARTICLE_FILTER
  ) as ArticlesFilter;
  const articles =
    params.src === 'clusters'
      ? await getClusterArticles(params.id, filter, sort)
      : await getListArticles(params.id, filter);
  const tweets =
    params.src === 'clusters'
      ? await getClusterTweets(params.id)
      : await getListTweets(params.id);
  return json<LoaderData>(
    { articles, tweets, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  const tweetsRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={tweetsRef}
        className='flex-1 flex flex-col max-w-xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={tweetsRef} header='Tweets' />
        <Empty className='flex-1 m-5'>
          <p className='uppercase'>an unexpected runtime error occurred</p>
          <p>{error.message}</p>
        </Empty>
      </section>
      <section
        ref={articlesRef}
        className='flex-1 flex flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef} header='Articles' />
        <Empty className='flex-1 m-5'>
          <p className='uppercase'>an unexpected runtime error occurred</p>
          <p>{error.message}</p>
        </Empty>
      </section>
    </main>
  );
}

export default function Cluster() {
  const { articles, tweets } = useLoaderData<LoaderData>();
  const tweetsRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={tweetsRef}
        className='flex-1 flex flex-col max-w-xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={tweetsRef} header='Tweets' />
        {!tweets.length && (
          <Empty className='flex-1 m-5'>NO TWEETS TO SHOW</Empty>
        )}
        {!!tweets.length && (
          <ol>
            {tweets.map((t) => (
              <TweetItem {...t} key={t.id} />
            ))}
          </ol>
        )}
      </section>
      <section
        ref={articlesRef}
        className='flex-1 flex flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef} header='Articles' />
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
    </main>
  );
}
