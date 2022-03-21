import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { useRef } from 'react';

import type { Article, Influencer, Tweet } from '~/types';
import { DEFAULT_FILTER, Filter, Sort } from '~/query';
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
  tweets?: (Tweet & { author: Influencer })[];
  articles?: Article[];
  locale: string;
};

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
// $type - the content type (e.g. articles or tweets).
export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  invariant(params.type, 'expected params.type');
  log.info(`Fetching ${params.type} for ${params.src} (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const res: LoaderData = { locale: lang(request) };
  if (params.type === 'articles') {
    const sort = (url.searchParams.get('sort') ?? Sort.AttentionScore) as Sort;
    const filter = (url.searchParams.get('filter') ?? DEFAULT_FILTER) as Filter;
    res.articles =
      params.src === 'clusters'
        ? await getClusterArticles(params.id, filter, sort)
        : await getListArticles(params.id, filter);
  } else {
    res.tweets =
      params.src === 'clusters'
        ? await getClusterTweets(params.id)
        : await getListTweets(params.id);
  }
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(res, { headers });
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
  const { articles, tweets } = useLoaderData<LoaderData>();
  const scrollerRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={scrollerRef}
        className='flex-none flex flex-col w-[40rem] border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={scrollerRef} />
        {articles && !articles.length && (
          <Empty className='flex-1 m-5'>NO ARTICLES TO SHOW</Empty>
        )}
        {articles && !!articles.length && (
          <ol>
            {articles.map((a) => (
              <ArticleItem {...a} key={a.url} />
            ))}
          </ol>
        )}
        {tweets && !tweets.length && (
          <Empty className='flex-1 m-5'>NO TWEETS TO SHOW</Empty>
        )}
        {tweets && !!tweets.length && (
          <ol>
            {tweets.map((t) => (
              <TweetItem {...t} key={t.id} />
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
