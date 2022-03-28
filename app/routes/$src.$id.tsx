import {
  Link,
  Outlet,
  json,
  useLoaderData,
  useLocation,
  useSearchParams,
} from 'remix';
import { useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

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
  getRektArticles,
  getRektTweets,
} from '~/query.server';
import { lang, log } from '~/utils.server';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import Header from '~/components/header';
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
  console.time('src-id-loader');
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
  let articles: Article[];
  let tweets: TweetFull[];
  switch (params.src) {
    case 'clusters':
      console.time('get-cluster-articles');
      articles = await getClusterArticles(
        params.id,
        articlesSort,
        articlesFilter,
        uid
      );
      console.timeEnd('get-cluster-articles');
      console.time('get-cluster-tweets');
      tweets = await getClusterTweets(
        params.id,
        tweetsSort,
        tweetsFilter,
        limit,
        uid
      );
      console.timeEnd('get-cluster-tweets');
      break;
    case 'lists':
      console.time('get-list-articles');
      articles = await getListArticles(
        params.id,
        articlesSort,
        articlesFilter,
        uid
      );
      console.timeEnd('get-list-articles');
      console.time('get-list-tweets');
      tweets = await getListTweets(
        params.id,
        tweetsSort,
        tweetsFilter,
        limit,
        uid
      );
      console.timeEnd('get-list-tweets');
      break;
    case 'rekt':
      console.time('get-rekt-articles');
      articles = await getRektArticles(uid);
      console.timeEnd('get-rekt-articles');
      console.time('get-rekt-tweets');
      tweets = await getRektTweets(tweetsSort, tweetsFilter, limit, uid);
      console.timeEnd('get-rekt-tweets');
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  console.timeEnd('src-id-loader');
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
    <div className='w-full h-full min-h-full fixed inset-0 overflow-hidden flex items-stretch'>
      <Header />
      <main className='flex flex-1 overflow-hidden'>
        <section
          ref={tweetsRef}
          className='flex-none w-[32rem] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-scroll'
        >
          <Nav scrollerRef={tweetsRef} header='Tweets' />
          <Empty className='flex-1 m-5'>
            <p>An unexpected runtime error occurred:</p>
            <p>{error.message}</p>
            <p className='mt-2'>
              Try logging out and in again. Or smash your keyboard; that
              sometimes helps. If you still have trouble, come and complain in{' '}
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
        <section
          ref={articlesRef}
          className='flex-none w-[40rem] lg:flex hidden flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-scroll'
        >
          <Nav scrollerRef={articlesRef} header='Articles' />
        </section>
      </main>
    </div>
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

  const [activeTweet, setActiveTweet] = useState<TweetFull>();

  const { pathname } = useLocation();
  const isList = /lists/.test(pathname);

  return (
    <div className='w-full h-full min-h-full fixed inset-0 overflow-hidden flex items-stretch'>
      <Header />
      <main className='flex flex-1 overflow-x-auto overflow-y-hidden'>
        <section
          ref={tweetsRef}
          id='tweets'
          className='flex-none w-[32rem] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-scroll'
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
            <Empty className='flex-1 m-5'>No tweets to show</Empty>
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
                {tweets.map((tweet) => (
                  <TweetItem
                    tweet={tweet}
                    setActiveTweet={setActiveTweet}
                    key={tweet.id}
                  />
                ))}
              </InfiniteScroll>
            </ol>
          )}
        </section>
        <Outlet context={activeTweet} />
        <section
          ref={articlesRef}
          id='articles'
          className='flex-none w-[40rem] lg:flex hidden flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-scroll'
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
            <Empty className='flex-1 m-5'>No articles to show</Empty>
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
    </div>
  );
}
