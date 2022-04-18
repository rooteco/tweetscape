import {
  json,
  useLoaderData,
  useLocation,
  useOutletContext,
  useSearchParams,
  useTransition,
} from 'remix';
import { useEffect, useRef } from 'react';
import InfiniteLoader from 'react-window-infinite-loader';
import type { LoaderFunction } from 'remix';
import { VariableSizeList } from 'react-window';
import invariant from 'tiny-invariant';
import mergeRefs from 'react-merge-refs';

import {
  DEFAULT_TWEETS_FILTER,
  DEFAULT_TWEETS_LIMIT,
  DEFAULT_TWEETS_SORT,
  Param,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import type { TweetFull, TweetJS } from '~/types';
import TweetItem, {
  FALLBACK_ITEM_HEIGHT,
  ITEM_WIDTH,
  getTweetItemHeight,
} from '~/components/tweet';
import { commitSession, getSession } from '~/session.server';
import { getClusterTweets, getListTweets, getRektTweets } from '~/query.server';
import { getUserIdFromSession, log, nanoid } from '~/utils.server';
import Column from '~/components/column';
import Empty from '~/components/empty';
import ErrorDisplay from '~/components/error';
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
import Switcher from '~/components/switcher';
import { useError } from '~/error';
import { wrapTweet } from '~/types';

export type LoaderData = TweetJS[];

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
  const uid = getUserIdFromSession(session);
  session.set('href', `${url.pathname}${url.search}`);
  const sort = Number(
    url.searchParams.get(Param.TweetsSort) ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const filter = Number(
    url.searchParams.get(Param.TweetsFilter) ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;
  const limit = Number(
    url.searchParams.get(Param.TweetsLimit) ?? DEFAULT_TWEETS_LIMIT
  );
  let tweetsPromise: Promise<TweetFull[]>;
  switch (params.src) {
    case 'clusters':
      tweetsPromise = getClusterTweets(params.id, sort, filter, limit, uid);
      break;
    case 'lists':
      tweetsPromise = getListTweets(
        BigInt(params.id),
        sort,
        filter,
        limit,
        uid
      );
      break;
    case 'rekt':
      tweetsPromise = getRektTweets(sort, filter, limit, uid);
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
  return json<LoaderData>(tweets.map(wrapTweet), { headers });
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <Column className='w-[36rem] border-x border-gray-200 dark:border-gray-800 flex items-stretch'>
      <ErrorDisplay error={error} />
    </Column>
  );
}

export default function TweetsPage() {
  const height = useOutletContext<number>();
  const tweets = useLoaderData<LoaderData>();
  const scrollerRef = useRef<HTMLElement>(null);
  const variableSizeListRef = useRef<VariableSizeList>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { pathname } = useLocation();
  const prevLength = useRef(tweets.length);
  const transition = useTransition();
  useEffect(() => {
    if (transition.state === 'idle' && prevLength.current < tweets.length) {
      // Recalculate the size of the now-loaded tweet item (which replaced the
      // previously fallback state, fixed height tweet item). If we don't do
      // this, `react-window` will wrongly use the height of the fallback item.
      variableSizeListRef.current?.resetAfterIndex(prevLength.current);
      prevLength.current = tweets.length;
    } else if (
      transition.state === 'loading' &&
      transition.location.pathname !== pathname
    ) {
      // Queue a recalculation of all the items loaded into the next page.
      prevLength.current = 0;
    }
  }, [transition.state, transition.location, tweets.length, pathname]);

  return (
    <Column
      ref={scrollerRef}
      id='tweets'
      className='w-[36rem] border-x border-gray-200 dark:border-gray-800'
    >
      <Nav scrollerRef={scrollerRef}>
        <Switcher
          icon={<SortIcon className='fill-current h-4 w-4 mr-1 inline-block' />}
          sections={[
            {
              header: 'Sort by',
              links: [
                {
                  name: 'Tweet count',
                  to: `?${Param.TweetsSort}=${TweetsSort.TweetCount}`,
                },
                {
                  name: 'Retweet count',
                  to: `?${Param.TweetsSort}=${TweetsSort.RetweetCount}`,
                },
                {
                  name: 'Quote count',
                  to: `?${Param.TweetsSort}=${TweetsSort.QuoteCount}`,
                },
                {
                  name: 'Like count',
                  to: `?${Param.TweetsSort}=${TweetsSort.LikeCount}`,
                },
                {
                  name: 'Follower count',
                  to: `?${Param.TweetsSort}=${TweetsSort.FollowerCount}`,
                },
                {
                  name: 'Latest first',
                  to: `?${Param.TweetsSort}=${TweetsSort.Latest}`,
                  isActiveByDefault: true,
                },
                {
                  name: 'Earliest first',
                  to: `?${Param.TweetsSort}=${TweetsSort.Earliest}`,
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
                  to: `?${Param.TweetsFilter}=${TweetsFilter.HideRetweets}`,
                },
                {
                  name: 'Show retweets',
                  to: `?${Param.TweetsFilter}=${TweetsFilter.ShowRetweets}`,
                  isActiveByDefault: true,
                },
              ],
            },
          ]}
        />
      </Nav>
      {!tweets.length && (
        <Empty className='flex-1 m-5'>No tweets to show</Empty>
      )}
      {!!tweets.length && (
        <ol>
          <InfiniteLoader
            isItemLoaded={(idx) => idx < tweets.length}
            itemCount={tweets.length + 1}
            threshold={30}
            loadMoreItems={() => {
              setSearchParams({
                ...Object.fromEntries(searchParams.entries()),
                [Param.TweetsLimit]: (
                  Number(searchParams.get(Param.TweetsLimit) ?? 50) + 50
                ).toString(),
              });
            }}
          >
            {({ onItemsRendered, ref }) => (
              <VariableSizeList
                itemCount={tweets.length + 1}
                onItemsRendered={onItemsRendered}
                estimatedItemSize={FALLBACK_ITEM_HEIGHT}
                itemSize={(idx) => getTweetItemHeight(tweets[idx])}
                height={height}
                width={ITEM_WIDTH}
                ref={mergeRefs([ref, variableSizeListRef])}
              >
                {({ index, style }) => (
                  <TweetItem
                    tweet={tweets[index]}
                    key={tweets[index]?.id ?? 'fallback'}
                    style={style}
                  />
                )}
              </VariableSizeList>
            )}
          </InfiniteLoader>
        </ol>
      )}
    </Column>
  );
}
