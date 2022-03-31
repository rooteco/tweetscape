import { Link, json, useLoaderData, useLocation, useSearchParams } from 'remix';
import { animated, useSpring } from '@react-spring/web';
import { useRef, useState } from 'react';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLES_FILTER,
  DEFAULT_ARTICLES_SORT,
} from '~/query';
import { commitSession, getSession } from '~/session.server';
import {
  getClusterArticles,
  getListArticles,
  getRektArticles,
} from '~/query.server';
import { log, nanoid } from '~/utils.server';
import type { Article } from '~/types';
import ArticleItem from '~/components/article';
import Column from '~/components/column';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import Header from '~/components/header';
import SortIcon from '~/icons/sort';
import { useError } from '~/error';

export type LoaderData = Article[];

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
  const uid = session.get('uid') as string | undefined;
  session.set('href', `${url.pathname}${url.search}`);
  const articlesSort = Number(
    url.searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    url.searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  let articlesPromise: Promise<Article[]>;
  switch (params.src) {
    case 'clusters':
      articlesPromise = getClusterArticles(
        params.id,
        articlesSort,
        articlesFilter,
        uid
      );
      break;
    case 'lists':
      articlesPromise = getListArticles(
        params.id,
        articlesSort,
        articlesFilter,
        uid
      );
      break;
    case 'rekt':
      articlesPromise = getRektArticles(uid);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  let articles: Article[] = [];
  await Promise.all([
    (async () => {
      console.time(`swr-get-articles-${invocationId}`);
      articles = await articlesPromise;
      console.timeEnd(`swr-get-articles-${invocationId}`);
    })(),
  ]);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(articles, { headers });
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  const articlesRef = useRef<HTMLElement>(null);
  return (
    <section ref={articlesRef} className='flex-none flex flex-col max-w-2xl'>
      <Header scrollerRef={articlesRef} header='Articles' />
      <Empty className='flex-1 m-5'>
        <p>An unexpected runtime error occurred:</p>
        <p>{error.message}</p>
        <p className='mt-2'>
          Try logging out and in again. Or smash your keyboard; that sometimes
          helps. If you still have trouble, come and complain in{' '}
          <a
            className='underline'
            href='https://discord.gg/3KYQBJwRSS'
            target='_blank'
            rel='noopener noreferrer'
          >
            our Discord server
          </a>
          ; we’re always more than happy to help.
        </p>
      </Empty>
    </section>
  );
}

type NavLinkProps = {
  active: boolean;
  children: string;
  articlesSort: ArticlesSort;
  articlesFilter: ArticlesFilter;
};
function NavLink({
  active,
  children,
  articlesSort,
  articlesFilter,
}: NavLinkProps) {
  return (
    <Link
      className={cn({ underline: active })}
      to={`?a=${articlesSort}&b=${articlesFilter}`}
    >
      {children}
    </Link>
  );
}

export default function ArticlesPage() {
  const articles = useLoaderData<LoaderData>();
  const articlesRef = useRef<HTMLElement>(null);

  const [searchParams] = useSearchParams();
  const articlesSort = Number(
    searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;

  const { pathname } = useLocation();
  const isList = /lists/.test(pathname);

  const [hover, setHover] = useState<{ y: number; height: number }>();
  const styles = useSpring({
    y: hover?.y,
    height: hover?.height,
    opacity: hover ? 1 : 0,
  });

  const [article, setArticle] = useState<Article>(articles[0]);

  return (
    <Column
      ref={articlesRef}
      id='articles'
      className='max-w-2xl p-5 relative'
      context={article}
    >
      {false && (
        <Header scrollerRef={articlesRef} header='Articles'>
          <div className='flex-none mr-4'>
            <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
            {!isList && (
              <NavLink
                articlesSort={ArticlesSort.AttentionScore}
                articlesFilter={articlesFilter}
                active={articlesSort === ArticlesSort.AttentionScore}
              >
                attention score
              </NavLink>
            )}
            {isList && (
              <span className='cursor-not-allowed'>attention score</span>
            )}
            {' · '}
            <NavLink
              articlesSort={ArticlesSort.TweetCount}
              articlesFilter={articlesFilter}
              active={articlesSort === ArticlesSort.TweetCount || isList}
            >
              tweets
            </NavLink>
          </div>
          <div className='flex-none'>
            <FilterIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={ArticlesFilter.HideRetweets}
              active={articlesFilter === ArticlesFilter.HideRetweets}
            >
              hide retweets
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={ArticlesFilter.ShowRetweets}
              active={articlesFilter === ArticlesFilter.ShowRetweets}
            >
              show retweets
            </NavLink>
          </div>
        </Header>
      )}
      {!articles.length && (
        <Empty className='flex-1 m-5'>No articles to show</Empty>
      )}
      {!!articles.length && (
        <div className='relative'>
          <animated.div
            style={styles}
            className='absolute rounded-lg bg-gray-100 dark:bg-gray-800 w-full -z-[1]'
          />
          {articles.map((a) => (
            <ArticleItem
              article={a}
              key={a.url}
              setHover={setHover}
              setArticle={setArticle}
            />
          ))}
        </div>
      )}
    </Column>
  );
}
