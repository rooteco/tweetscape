import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { animated, useSpring } from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { dequal } from 'dequal/lite';
import invariant from 'tiny-invariant';
import { json } from '@remix-run/node';

import type { ArticleFull, ArticleJS } from '~/prototype/prototype/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLES_FILTER,
  DEFAULT_ARTICLES_SORT,
  DEFAULT_TIME,
  Param,
  Time,
} from '~/prototype/prototype/query';
import {
  commitSession,
  getSession,
} from '~/prototype/prototype/session.server';
import {
  getClusterArticles,
  getClusterArticlesQuery,
  getListArticles,
  getListArticlesQuery,
  getRektArticles,
  getRektArticlesQuery,
} from '~/prototype/prototype/query.server';
import {
  getUserIdFromSession,
  log,
  nanoid,
} from '~/prototype/prototype/utils.server';
import ArticleItem from '~/prototype/prototype/components/article';
import Column from '~/prototype/prototype/components/column';
import Empty from '~/prototype/prototype/components/empty';
import ErrorDisplay from '~/prototype/prototype/components/error';
import FilterIcon from '~/prototype/prototype/icons/filter';
import Nav from '~/prototype/prototype/components/nav';
import SortIcon from '~/prototype/prototype/icons/sort';
import Switcher from '~/prototype/prototype/components/switcher';
import TimeIcon from '~/prototype/prototype/icons/time';
import { handleTwitterApiError } from '~/prototype/prototype/twitter.server';
import { invalidateCacheForQuery } from '~/prototype/prototype/swr.server';
import { syncArticleMetadata } from '~/prototype/prototype/sync/articles.server';
import { action as syncTweets } from '~/prototype/prototype/routes/$src.$id/tweets';
import { useError } from '~/prototype/prototype/error';
import useSync from '~/prototype/prototype/hooks/sync';
import { wrapArticle } from '~/prototype/prototype/types';

export type LoaderData = ArticleJS[];

function parseSearchParams(searchParams: URLSearchParams) {
  const sort = Number(
    searchParams.get(Param.ArticlesSort) ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const filter = Number(
    searchParams.get(Param.ArticlesFilter) ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const time = Number(searchParams.get(Param.Time) ?? DEFAULT_TIME) as Time;
  return { sort, filter, time };
}

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  const invocationId = nanoid(5);
  console.time(`src-id-loader-${invocationId}`);
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for ${params.src} (${params.id})...`);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = getUserIdFromSession(session);
  const url = new URL(request.url);
  session.set('href', `${url.pathname}${url.search}`);
  const { sort, filter, time } = parseSearchParams(url.searchParams);
  let articles: ArticleFull[] = [];
  switch (params.src) {
    case 'clusters':
      articles = await getClusterArticles(params.id, sort, filter, time, uid);
      break;
    case 'lists':
      articles = await getListArticles(
        BigInt(params.id),
        sort,
        filter,
        time,
        uid
      );
      break;
    case 'rekt':
      articles = await getRektArticles(time, uid);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(articles.map(wrapArticle), { headers });
};

export const action: ActionFunction = async ({ params, request, ...rest }) => {
  try {
    const res = (await syncTweets({ params, request, ...rest })) as Response;
    if (res.status !== 200) return res;
    invariant(params.src, 'expected params.src');
    invariant(params.id, 'expected params.id');
    const session = await getSession(request.headers.get('Cookie'));
    const uid = getUserIdFromSession(session);
    const url = new URL(request.url);
    const { sort, filter, time } = parseSearchParams(url.searchParams);
    let articles: ArticleFull[] = [];
    switch (params.src) {
      case 'clusters':
        articles = await getClusterArticles(params.id, sort, filter, time, uid);
        break;
      case 'lists':
        articles = await getListArticles(
          BigInt(params.id),
          sort,
          filter,
          time,
          uid
        );
        break;
      case 'rekt':
        articles = await getRektArticles(time, uid);
        break;
      default:
        throw new Response('Not Found', { status: 404 });
    }
    await syncArticleMetadata(articles);
    let query: string;
    switch (params.src) {
      case 'clusters':
        query = getClusterArticlesQuery(params.id, sort, filter, time, uid);
        break;
      case 'lists':
        query = getListArticlesQuery(
          BigInt(params.id),
          sort,
          filter,
          time,
          uid
        );
        break;
      case 'rekt':
        query = getRektArticlesQuery(time, uid);
        break;
      default:
        throw new Response('Not Found', { status: 404 });
    }
    await invalidateCacheForQuery(query, uid);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return json({}, { status: 200, headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <Column className='w-[42rem] border-x border-gray-200 dark:border-gray-800 flex items-stretch'>
      <ErrorDisplay error={error} />
    </Column>
  );
}

export default function ArticlesPage() {
  const articles = useLoaderData<LoaderData>();
  const scrollerRef = useRef<HTMLElement>(null);

  const [hover, setHover] = useState<{ y: number; height: number }>();
  const styles = useSpring({
    y: hover?.y,
    height: hover?.height,
    opacity: hover ? 1 : 0,
  });

  const { pathname } = useLocation();
  const [article, setArticle] = useState<ArticleJS>(() => {
    const url = decodeURIComponent(pathname.split('/')[4]);
    return articles.find((a) => a.url === url) ?? articles[0];
  });
  useEffect(() => {
    setArticle((prev) => {
      const url = decodeURIComponent(pathname.split('/')[4]);
      const found = articles.find((a) => a.url === url);
      if (dequal(found, prev) || !found) return prev;
      return found;
    });
  }, [articles, pathname]);

  const { indicator } = useSync();

  return (
    <Column
      ref={scrollerRef}
      className='w-[42rem] border-x border-gray-200 dark:border-gray-800'
      context={article}
    >
      <Nav scrollerRef={scrollerRef}>
        <Switcher
          icon={
            <SortIcon className='fill-gray-500 h-4 w-4 mr-1 inline-block' />
          }
          sections={[
            {
              header: 'Sort by',
              links: [
                {
                  name: 'Attention score',
                  to: `?${Param.ArticlesSort}=${ArticlesSort.AttentionScore}`,
                  isActiveByDefault:
                    DEFAULT_ARTICLES_SORT === ArticlesSort.AttentionScore,
                },
                {
                  name: 'Tweet count',
                  to: `?${Param.ArticlesSort}=${ArticlesSort.TweetCount}`,
                },
              ],
            },
          ]}
        />
        <Switcher
          icon={
            <FilterIcon className='fill-gray-500 h-4 w-4 mr-1 inline-block' />
          }
          sections={[
            {
              header: 'Filter',
              links: [
                {
                  name: 'Hide retweets',
                  to: `?${Param.ArticlesFilter}=${ArticlesFilter.HideRetweets}`,
                  isActiveByDefault:
                    DEFAULT_ARTICLES_FILTER === ArticlesFilter.HideRetweets,
                },
                {
                  name: 'Show retweets',
                  to: `?${Param.ArticlesFilter}=${ArticlesFilter.ShowRetweets}`,
                },
              ],
            },
          ]}
        />
        <Switcher
          icon={
            <TimeIcon className='fill-gray-500 h-4 w-4 mr-1 inline-block' />
          }
          sections={[
            {
              header: 'From the last',
              links: [
                {
                  name: 'Day',
                  to: `?${Param.Time}=${Time.Day}`,
                },
                {
                  name: 'Week',
                  to: `?${Param.Time}=${Time.Week}`,
                  isActiveByDefault: true,
                },
                {
                  name: 'Month',
                  to: `?${Param.Time}=${Time.Month}`,
                },
                {
                  name: 'Year',
                  to: `?${Param.Time}=${Time.Year}`,
                },
                {
                  name: 'Decade',
                  to: `?${Param.Time}=${Time.Decade}`,
                },
                {
                  name: 'Century',
                  to: `?${Param.Time}=${Time.Century}`,
                },
              ],
            },
          ]}
        />
        {indicator}
      </Nav>
      {!articles.length && (
        <Empty className='flex-1 m-5'>No articles to show</Empty>
      )}
      {!!articles.length && (
        <div className='relative m-3'>
          <animated.div
            style={styles}
            className='absolute rounded-lg bg-gray-100 dark:bg-gray-800 w-full -z-[1]'
          />
          {articles.map((a) => (
            <ArticleItem article={a} key={a.url} setHover={setHover} />
          ))}
        </div>
      )}
    </Column>
  );
}
