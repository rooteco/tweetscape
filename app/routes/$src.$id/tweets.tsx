import { Link, json, useLoaderData, useSearchParams } from 'remix';
import { useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import {
  DEFAULT_TWEETS_FILTER,
  DEFAULT_TWEETS_LIMIT,
  DEFAULT_TWEETS_SORT,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { commitSession, getSession } from '~/session.server';
import { getClusterTweets, getListTweets, getRektTweets } from '~/query.server';
import { log, nanoid } from '~/utils.server';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import Header from '~/components/header';
import SortIcon from '~/icons/sort';
import type { TweetFull } from '~/types';
import TweetItem from '~/components/tweet';
import { useError } from '~/error';

export type LoaderData = TweetFull[];

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  const invocationId = nanoid(5);
  console.time(`src-id-loader-${invocationId}`);
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching tweets for ${params.src} (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  session.set('href', `${url.pathname}${url.search}`);
  const tweetsSort = Number(
    url.searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    url.searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;
  const limit = Number(url.searchParams.get('l') ?? DEFAULT_TWEETS_LIMIT);
  let tweetsPromise: Promise<TweetFull[]>;
  switch (params.src) {
    case 'clusters':
      tweetsPromise = getClusterTweets(
        params.id,
        tweetsSort,
        tweetsFilter,
        limit,
        uid
      );
      break;
    case 'lists':
      tweetsPromise = getListTweets(
        params.id,
        tweetsSort,
        tweetsFilter,
        limit,
        uid
      );
      break;
    case 'rekt':
      tweetsPromise = getRektTweets(tweetsSort, tweetsFilter, limit, uid);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  let tweets: TweetFull[] = [];
  await Promise.all([
    (async () => {
      console.time(`swr-get-tweets-${invocationId}`);
      tweets = await tweetsPromise;
      console.timeEnd(`swr-get-tweets-${invocationId}`);
    })(),
  ]);
  console.timeEnd(`src-id-loader-${invocationId}`);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(tweets, { headers });
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  const tweetsRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={tweetsRef}
      className='flex-none w-[32rem] flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-y-scroll'
    >
      <Header scrollerRef={tweetsRef} header='Tweets' />
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
  tweetsSort: TweetsSort;
  tweetsFilter: TweetsFilter;
};
function NavLink({ active, children, tweetsSort, tweetsFilter }: NavLinkProps) {
  return (
    <Link
      className={cn({ underline: active })}
      to={`?c=${tweetsSort}&d=${tweetsFilter}`}
    >
      {children}
    </Link>
  );
}

export default function TweetsPage() {
  const tweets = useLoaderData<LoaderData>();
  const tweetsRef = useRef<HTMLElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const tweetsSort = Number(
    searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;

  const [activeTweet, setActiveTweet] = useState<TweetFull>();

  return (
    <section
      ref={tweetsRef}
      id='tweets'
      className='flex-none w-[32rem] flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-y-scroll'
    >
      <Header scrollerRef={tweetsRef} header='Tweets'>
        <div className='flex-none mr-4'>
          <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
          <NavLink
            tweetsSort={TweetsSort.TweetCount}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.TweetCount}
          >
            tweets
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={TweetsSort.RetweetCount}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.RetweetCount}
          >
            retweets
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={TweetsSort.QuoteCount}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.QuoteCount}
          >
            quotes
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={TweetsSort.LikeCount}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.LikeCount}
          >
            likes
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={TweetsSort.FollowerCount}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.FollowerCount}
          >
            followers
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={TweetsSort.Latest}
            tweetsFilter={tweetsFilter}
            active={tweetsSort === TweetsSort.Latest}
          >
            latest
          </NavLink>
          {' · '}
          <NavLink
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
            tweetsSort={tweetsSort}
            tweetsFilter={TweetsFilter.HideRetweets}
            active={tweetsFilter === TweetsFilter.HideRetweets}
          >
            hide retweets
          </NavLink>
          {' · '}
          <NavLink
            tweetsSort={tweetsSort}
            tweetsFilter={TweetsFilter.ShowRetweets}
            active={tweetsFilter === TweetsFilter.ShowRetweets}
          >
            show retweets
          </NavLink>
        </div>
      </Header>
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
  );
}
