import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { animated, useSpring } from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useLocation } from '@remix-run/react';
import { dequal } from 'dequal/lite';
import invariant from 'tiny-invariant';
import { json } from '@remix-run/node';

import type { ArticleFull, ArticleJS } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLES_FILTER,
  DEFAULT_ARTICLES_SORT,
  DEFAULT_TIME,
  Param,
  Time,
} from '~/query';
import { commitSession, getSession } from '~/session.server';
import {
  getClusterArticles,
  getListArticles,
  getRektArticles,
} from '~/query.server';
import { getUserIdFromSession, log, nanoid } from '~/utils.server';
import ArticleItem from '~/components/article';
import Column from '~/components/column';
import Empty from '~/components/empty';
import ErrorDisplay from '~/components/error';
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
import Switcher from '~/components/switcher';
import TimeIcon from '~/icons/time';
import { syncArticleMetadata } from '~/sync/articles.server';
import { action as syncTweets } from '~/routes/$src.$id/tweets';
import { useError } from '~/error';
import useSync from '~/hooks/sync';
import { wrapArticle } from '~/types';

export type LoaderData = ArticleJS[];

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  const invocationId = nanoid(5);
  console.time(`src-id-loader-${invocationId}`);
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles for ${params.src} (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = getUserIdFromSession(session);
  session.set('href', `${url.pathname}${url.search}`);
  const sort = Number(
    url.searchParams.get(Param.ArticlesSort) ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const filter = Number(
    url.searchParams.get(Param.ArticlesFilter) ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const time = Number(url.searchParams.get(Param.Time) ?? DEFAULT_TIME) as Time;
  let articlesPromise: Promise<ArticleFull[]>;
  switch (params.src) {
    case 'clusters':
      articlesPromise = getClusterArticles(params.id, sort, filter, time, uid);
      break;
    case 'lists':
      articlesPromise = getListArticles(
        BigInt(params.id),
        sort,
        filter,
        time,
        uid
      );
      break;
    case 'rekt':
      articlesPromise = getRektArticles(time, uid);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  let articles: ArticleFull[] = [];
  await Promise.all([
    (async () => {
      console.time(`swr-get-articles-${invocationId}`);
      articles = await articlesPromise;
      console.timeEnd(`swr-get-articles-${invocationId}`);
    })(),
  ]);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(articles.map(wrapArticle), { headers });
};

export const action: ActionFunction = async ({ params, request, ...rest }) => {
  await syncTweets({ params, request, ...rest });
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  const url = new URL(request.url);
  const sort = Number(
    url.searchParams.get(Param.ArticlesSort) ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const filter = Number(
    url.searchParams.get(Param.ArticlesFilter) ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const time = Number(url.searchParams.get(Param.Time) ?? DEFAULT_TIME) as Time;
  let articles: ArticleFull[] = [];
  switch (params.src) {
    case 'clusters':
      articles = await getClusterArticles(params.id, sort, filter, time);
      break;
    case 'lists':
      articles = await getListArticles(BigInt(params.id), sort, filter, time);
      break;
    case 'rekt':
      articles = await getRektArticles(time);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  await syncArticleMetadata(articles);
  return new Response('Sync Success');
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
          icon={<SortIcon className='fill-current h-4 w-4 mr-1 inline-block' />}
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
            <FilterIcon className='fill-current h-4 w-4 mr-1 inline-block' />
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
          icon={<TimeIcon className='fill-current h-4 w-4 mr-1 inline-block' />}
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
