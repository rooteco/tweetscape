import { Link, json, useLoaderData, useLocation, useSearchParams } from 'remix';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';
import { useRef } from 'react';

import type { Article, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLES_FILTER,
  DEFAULT_ARTICLES_SORT,
  DEFAULT_TWEETS_FILTER,
  DEFAULT_TWEETS_LIMIT,
  DEFAULT_TWEETS_SORT,
  TweetsFilter,
  TweetsSort,
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
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
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
  const uid = session.get('uid') as string | undefined;
  session.set('href', `${url.pathname}${url.search}`);
  const articlesSort = Number(
    url.searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    url.searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const tweetsSort = Number(
    url.searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    url.searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;
  const limit = Number(url.searchParams.get('l') ?? DEFAULT_TWEETS_LIMIT);
  const articles =
    params.src === 'clusters'
      ? await getClusterArticles(params.id, articlesSort, articlesFilter, uid)
      : await getListArticles(params.id, articlesSort, articlesFilter, uid);
  const tweets =
    params.src === 'clusters'
      ? await getClusterTweets(params.id, tweetsSort, tweetsFilter, limit, uid)
      : await getListTweets(params.id, tweetsSort, tweetsFilter, limit, uid);
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
        className='flex-1 lg:flex hidden flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef} header='Articles' />
      </section>
    </main>
  );
}

type NavLinkProps = {
  active: boolean;
  children: string;
  articlesSort: ArticlesSort;
  articlesFilter: ArticlesFilter;
  tweetsSort: TweetsSort;
  tweetsFilter: TweetsFilter;
};
function NavLink({
  active,
  children,
  articlesSort,
  articlesFilter,
  tweetsSort,
  tweetsFilter,
}: NavLinkProps) {
  return (
    <Link
      className={cn({ underline: active })}
      to={`?a=${articlesSort}&b=${articlesFilter}&c=${tweetsSort}&d=${tweetsFilter}`}
    >
      {children}
    </Link>
  );
}

export default function Cluster() {
  const { articles, tweets } = useLoaderData<LoaderData>();
  const tweetsRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const articlesSort = Number(
    searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const tweetsSort = Number(
    searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;

  const isList = /lists/.test(useLocation().pathname);

  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={tweetsRef}
        id='tweets'
        className='flex-1 flex flex-col max-w-xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={tweetsRef} header='Tweets'>
          <div className='flex-none mr-4'>
            <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.TweetCount}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.TweetCount}
            >
              tweets
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.RetweetCount}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.RetweetCount}
            >
              retweets
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.QuoteCount}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.QuoteCount}
            >
              quotes
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.LikeCount}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.LikeCount}
            >
              likes
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.FollowerCount}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.FollowerCount}
            >
              followers
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.Latest}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.Latest}
            >
              latest
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={TweetsSort.Earliest}
              tweetsFilter={tweetsFilter}
              active={tweetsSort === TweetsSort.Earliest}
            >
              earliest
            </NavLink>
          </div>
          <div className='flex-none'>
            <FilterIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={tweetsSort}
              tweetsFilter={TweetsFilter.HideRetweets}
              active={tweetsFilter === TweetsFilter.HideRetweets}
            >
              hide retweets
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={articlesFilter}
              tweetsSort={tweetsSort}
              tweetsFilter={TweetsFilter.ShowRetweets}
              active={tweetsFilter === TweetsFilter.ShowRetweets}
            >
              show retweets
            </NavLink>
          </div>
        </Nav>
        {!tweets.length && (
          <Empty className='flex-1 m-5'>NO TWEETS TO SHOW</Empty>
        )}
        {!!tweets.length && (
          <ol>
            <InfiniteScroll
              dataLength={tweets.length}
              next={() =>
                setSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  l: (Number(searchParams.get('l') ?? 50) + 50).toString(),
                })
              }
              loader={Array(3)
                .fill(null)
                .map((_, idx) => (
                  <TweetItem key={idx} />
                ))}
              scrollThreshold={0.65}
              scrollableTarget='tweets'
              style={{ overflow: 'hidden' }}
              hasMore
            >
              {tweets.map((t) => (
                <TweetItem {...t} key={t.id} />
              ))}
            </InfiniteScroll>
          </ol>
        )}
      </section>
      <section
        ref={articlesRef}
        id='articles'
        className='flex-1 lg:flex hidden flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef} header='Articles'>
          <div className='flex-none mr-4'>
            <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
            {!isList && (
              <NavLink
                articlesSort={ArticlesSort.AttentionScore}
                articlesFilter={articlesFilter}
                tweetsSort={tweetsSort}
                tweetsFilter={tweetsFilter}
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
              tweetsSort={tweetsSort}
              tweetsFilter={tweetsFilter}
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
              tweetsSort={tweetsSort}
              tweetsFilter={tweetsFilter}
              active={articlesFilter === ArticlesFilter.HideRetweets}
            >
              hide retweets
            </NavLink>
            {' · '}
            <NavLink
              articlesSort={articlesSort}
              articlesFilter={ArticlesFilter.ShowRetweets}
              tweetsSort={tweetsSort}
              tweetsFilter={tweetsFilter}
              active={articlesFilter === ArticlesFilter.ShowRetweets}
            >
              show retweets
            </NavLink>
          </div>
        </Nav>
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
