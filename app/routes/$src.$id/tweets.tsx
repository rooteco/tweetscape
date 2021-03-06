import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { useEffect, useRef } from 'react';
import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
} from '@remix-run/react';
import InfiniteLoader from 'react-window-infinite-loader';
import type { TwitterApi } from 'twitter-api-v2';
import { VariableSizeList } from 'react-window';
import invariant from 'tiny-invariant';
import { json } from '@remix-run/node';
import mergeRefs from 'react-merge-refs';

import {
  DEFAULT_TIME,
  DEFAULT_TWEETS_FILTER,
  DEFAULT_TWEETS_LIMIT,
  DEFAULT_TWEETS_SORT,
  Param,
  Time,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import type { Rekt, TweetFull, TweetJS, User } from '~/types';
import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  USER_FIELDS,
  executeCreateQueue,
  getClient,
  handleTwitterApiError,
  initQueue,
  toCreateQueue,
} from '~/twitter.server';
import TweetItem, {
  FALLBACK_ITEM_HEIGHT,
  ITEM_WIDTH,
  getTweetItemHeight,
} from '~/components/tweet';
import { commitSession, getSession } from '~/session.server';
import {
  getClusterTweets,
  getClusterTweetsQuery,
  getListTweets,
  getListTweetsQuery,
  getRektTweets,
  getRektTweetsQuery,
} from '~/query.server';
import { getUserIdFromSession, log, nanoid } from '~/utils.server';
import Column from '~/components/column';
import Empty from '~/components/empty';
import ErrorDisplay from '~/components/error';
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
import Switcher from '~/components/switcher';
import TimeIcon from '~/icons/time';
import { createHash } from '~/crypto.server';
import { db } from '~/db.server';
import { invalidateCacheForQuery } from '~/swr.server';
import { useError } from '~/error';
import useSync from '~/hooks/sync';
import { wrapTweet } from '~/types';

export type LoaderData = TweetJS[];

function parseSearchParams(searchParams: URLSearchParams) {
  const sort = Number(
    searchParams.get(Param.TweetsSort) ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const filter = Number(
    searchParams.get(Param.TweetsFilter) ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;
  const time = Number(searchParams.get(Param.Time) ?? DEFAULT_TIME) as Time;
  const limit = Number(
    searchParams.get(Param.TweetsLimit) ?? DEFAULT_TWEETS_LIMIT
  );
  return { sort, filter, time, limit };
}

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  const invocationId = nanoid(5);
  console.time(`src-id-loader-${invocationId}`);
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching tweets for ${params.src} (${params.id})...`);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = getUserIdFromSession(session);
  const url = new URL(request.url);
  const { sort, filter, time, limit } = parseSearchParams(url.searchParams);
  session.set('href', `${url.pathname}${url.search}`);
  let tweets: TweetFull[];
  switch (params.src) {
    case 'clusters':
      tweets = await getClusterTweets(
        params.id,
        sort,
        filter,
        time,
        limit,
        uid
      );
      break;
    case 'lists':
      tweets = await getListTweets(
        BigInt(params.id),
        sort,
        filter,
        time,
        limit,
        uid
      );
      break;
    case 'rekt':
      tweets = await getRektTweets(sort, filter, time, limit, uid);
      break;
    default:
      throw new Response('Not Found', { status: 404 });
  }
  console.timeEnd(`src-id-loader-${invocationId}`);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(tweets.map(wrapTweet), { headers });
};

interface RektInfluencer {
  id: number;
  screen_name: string;
  name: string;
  profile_picture: string;
  points_v2: number;
  rank: number;
  followers: number;
  followers_in_people_count: number;
}

async function syncTweetsFromUsernames(api: TwitterApi, usernames: string[]) {
  log.info(`Syncing tweets from ${usernames.length} users...`);
  const queries: string[] = [];
  usernames.forEach((username) => {
    const query = queries[queries.length - 1];
    if (query && `${query} OR from:${username}`.length < 512)
      queries[queries.length - 1] = `${query} OR from:${username}`;
    else queries.push(`from:${username}`);
  });
  const queue = initQueue();
  await Promise.all(
    queries.map(async (query) => {
      log.trace(`Query (${query.length}):\n${query}`);
      const hash = createHash('sha256').update(query).digest('hex');
      const key = `sinceid:${hash}`;
      const id = (await redis.get(key)) ?? undefined;
      log.trace(`Pagination id for query (${query.length}): ${id}`);
      const res = await api.v2.search(query, {
        'max_results': 100,
        'since_id': id,
        'tweet.fields': TWEET_FIELDS,
        'expansions': TWEET_EXPANSIONS,
        'user.fields': USER_FIELDS,
      });
      toCreateQueue(res, queue);
      if (res.meta.next_token) {
        // Twitter's recent search API limits the `since_id` to be within a wk.
        // @see {@link https://github.com/rooteco/tweetscape/issues/421}
        const SECONDS_IN_A_WEEK = 60 * 60 * 24 * 7;
        await redis.setEx(key, SECONDS_IN_A_WEEK, res.meta.newest_id);
      }
    })
  );
  await executeCreateQueue(queue);
}

export const action: ActionFunction = async ({ params, request }) => {
  try {
    const invocationId = nanoid(5);
    console.time(`src-id-loader-${invocationId}`);
    invariant(params.src, 'expected params.src');
    invariant(params.id, 'expected params.id');
    log.info(`Fetching tweets for ${params.src} (${params.id})...`);
    const { api, session } = await getClient(request);
    switch (params.src) {
      case 'clusters': {
        log.info(`Fetching scores for cluster (${params.id}) from database...`);
        const scores = await db.scores.findMany({
          where: { clusters: { slug: params.id } },
          orderBy: { rank: 'asc' },
        });
        const usernames = scores.map((s) => s.user_id.toString());
        await syncTweetsFromUsernames(api, usernames);
        break;
      }
      case 'lists': {
        log.info(`Fetching tweets from list (${params.id})...`);
        const key = `latest-tweet-id:list-tweets:${params.id}`;
        const latestTweetId = await redis.get(key);
        log.debug(`Found the latest tweet (${params.id}): ${latestTweetId}`);
        const check = await api.v2.listTweets(params.id, { max_results: 1 });
        const latestTweet = check.tweets[0];
        if (latestTweet && latestTweet.id === latestTweetId) {
          log.debug(`Skipping fetch for list (${params.id})...`);
        } else {
          if (latestTweet) await redis.set(key, check.tweets[0].id);
          const res = await api.v2.listTweets(params.id, {
            'tweet.fields': TWEET_FIELDS,
            'expansions': TWEET_EXPANSIONS,
            'user.fields': USER_FIELDS,
          });
          const queue = toCreateQueue(res, initQueue(), BigInt(params.id));
          await executeCreateQueue(queue);
        }
        break;
      }
      case 'rekt': {
        const n = 1000;
        log.info(`Fetching ${n} rekt scores...`);
        const res = await fetch(
          `https://feed.rekt.news/api/v1/parlor/crypto/0/${n}`
        );
        const influencers = (await res.json()) as RektInfluencer[];
        log.info(`Fetching ${influencers.length} rekt users...`);
        const splits: RektInfluencer[][] = [];
        while (influencers.length) splits.push(influencers.splice(0, 100));
        const usersToCreate: User[] = [];
        const scoresToCreate: Rekt[] = [];
        await Promise.all(
          splits.map(async (scores) => {
            const data = await api.v2.usersByUsernames(
              scores.map((r) => r.screen_name),
              { 'user.fields': USER_FIELDS }
            );
            log.info(`Parsing ${data.data.length} users...`);
            const users = data.data.map((u) => ({
              id: BigInt(u.id),
              name: u.name,
              username: u.username,
              verified: u.verified ?? null,
              description: u.description ?? null,
              profile_image_url: u.profile_image_url ?? null,
              followers_count: u.public_metrics?.followers_count ?? null,
              following_count: u.public_metrics?.following_count ?? null,
              tweets_count: u.public_metrics?.tweet_count ?? null,
              created_at: u.created_at ? new Date(u.created_at) : null,
              updated_at: new Date(),
            }));
            users.forEach((i) => usersToCreate.push(i));
            log.info(`Parsing ${scores.length} rekt scores...`);
            const rekt = scores.map((d) => ({
              id: BigInt(d.id),
              user_id: users.find((i) => i.username === d.screen_name)
                ?.id as bigint,
              username: d.screen_name,
              name: d.name,
              profile_image_url: d.profile_picture,
              points: d.points_v2,
              rank: d.rank,
              followers_count: d.followers,
              followers_in_people_count: d.followers_in_people_count,
            }));
            const missing = rekt.filter((r) => !r.user_id);
            log.warn(`Missing: ${missing.map((u) => u.username).join()}`);
            rekt
              .filter((r) => r.user_id)
              .forEach((r) => scoresToCreate.push(r));
          })
        );
        log.info(`Inserting ${scoresToCreate.length} rekt scores and users...`);
        const skipDuplicates = true;
        await db.$transaction([
          db.users.createMany({ data: usersToCreate, skipDuplicates }),
          db.rekt.createMany({ data: scoresToCreate, skipDuplicates }),
        ]);
        const usernames = usersToCreate.map((u) => u.username);
        await syncTweetsFromUsernames(api, usernames);
        break;
      }
      default:
        throw new Response('Not Found', { status: 404 });
    }
    const url = new URL(request.url);
    const uid = getUserIdFromSession(session);
    const { sort, filter, time, limit } = parseSearchParams(url.searchParams);
    let query: string;
    switch (params.src) {
      case 'clusters':
        query = getClusterTweetsQuery(
          params.id,
          sort,
          filter,
          time,
          limit,
          uid
        );
        break;
      case 'lists':
        query = getListTweetsQuery(
          BigInt(params.id),
          sort,
          filter,
          time,
          limit,
          uid
        );
        break;
      case 'rekt':
        query = getRektTweetsQuery(sort, filter, time, limit, uid);
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

  useEffect(() => {
    // TODO: Do some more advanced (and more performant) size re-calculations.
    // @see {@link https://github.com/rooteco/tweetscape/blob/develop/app/routes/%24src.%24id/tweets.tsx#L353-L367}
    variableSizeListRef.current?.resetAfterIndex(0);
  });

  const { syncing, indicator } = useSync();

  return (
    <Column
      ref={scrollerRef}
      id='tweets'
      className='w-[36rem] border-x border-gray-200 dark:border-gray-800'
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
            <FilterIcon className='fill-gray-500 h-4 w-4 mr-1 inline-block' />
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
      {(!!tweets.length || syncing) && (
        <ol>
          <InfiniteLoader
            isItemLoaded={(idx) => idx < tweets.length}
            itemCount={tweets.length + (syncing ? 10 : 1)}
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
                itemCount={tweets.length + (syncing ? 10 : 1)}
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
                    key={tweets[index]?.id ?? `fallback-${index}`}
                    style={style}
                  />
                )}
              </VariableSizeList>
            )}
          </InfiniteLoader>
        </ol>
      )}
      {!syncing && !tweets.length && (
        <Empty className='flex-1 m-5'>No tweets to show</Empty>
      )}
    </Column>
  );
}
