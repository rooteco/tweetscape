import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { useEffect, useRef } from 'react';
import {
  useLoaderData,
  useLocation,
  useOutletContext,
  useSearchParams,
  useTransition,
} from '@remix-run/react';
import InfiniteLoader from 'react-window-infinite-loader';
import type { TwitterApi } from 'twitter-api-v2';
import { VariableSizeList } from 'react-window';
import invariant from 'tiny-invariant';
import { json } from '@remix-run/node';
import mergeRefs from 'react-merge-refs';

import type { Cluster, Rekt, TweetFull, TweetJS, User } from '~/types';
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
import TweetItem, {
  FALLBACK_ITEM_HEIGHT,
  ITEM_WIDTH,
  getTweetItemHeight,
} from '~/components/tweet';
import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  USER_FIELDS,
  executeCreateQueue,
  getClient,
  initQueue,
  toCreateQueue,
} from '~/twitter.server';
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
import TimeIcon from '~/icons/time';
import { createHash } from '~/crypto.server';
import { db } from '~/db.server';
import { useError } from '~/error';
import useSync from '~/hooks/sync';
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
  const time = Number(url.searchParams.get(Param.Time) ?? DEFAULT_TIME) as Time;
  const limit = Number(
    url.searchParams.get(Param.TweetsLimit) ?? DEFAULT_TWEETS_LIMIT
  );
  let tweetsPromise: Promise<TweetFull[]>;
  switch (params.src) {
    case 'clusters':
      tweetsPromise = getClusterTweets(
        params.id,
        sort,
        filter,
        time,
        limit,
        uid
      );
      break;
    case 'lists':
      tweetsPromise = getListTweets(
        BigInt(params.id),
        sort,
        filter,
        time,
        limit,
        uid
      );
      break;
    case 'rekt':
      tweetsPromise = getRektTweets(sort, filter, time, limit, uid);
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

interface BorgCluster {
  active: boolean;
  created_at: string;
  id: string;
  name: string;
  updated_at: string;
}

interface BorgSocialAccount {
  created_at: string;
  description: string;
  followers_count: string;
  following_count: string;
  id: string;
  location: string;
  name: string;
  personal: boolean;
  profile_image_url: string;
  screen_name: string;
  tweets_count: string;
  updated_at: string;
  url: string;
}

interface BorgInfluencer {
  attention_score: number;
  attention_score_change_week: number;
  cluster_id: string;
  created_at: string;
  id: string;
  identity: { clusters: BorgCluster[] };
  insider_score: number;
  personal_rank: string;
  rank: string;
  social_accounts: { social_account: BorgSocialAccount }[];
  social_account: { social_account: BorgSocialAccount };
}

interface BorgResponse {
  influencers: BorgInfluencer[];
  total: string;
  has_more: boolean;
}

async function getBorgCollectiveInfluencers(c: Cluster, pg = 0) {
  log.debug(`Fetching influencers (${pg}) for ${c.name} (${c.id})...`);
  const url =
    `https://api.borg.id/influence/clusters/${c.name}/influencers?` +
    `page=${pg}&sort_by=score&sort_direction=desc&influence_type=all`;
  const headers = { authorization: `Token ${process.env.HIVE_TOKEN}` };
  const data = (await (await fetch(url, { headers })).json()) as BorgResponse;
  if (data.influencers && data.total) return data;
  log.warn(`Fetched influencers: ${JSON.stringify(data, null, 2)}`);
  return { influencers: [], total: 0 };
}

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
      log.debug(`Query (${query.length}):\n${query}`);
      const hash = createHash('sha256').update(query).digest('hex');
      const key = `sinceid:${hash}`;
      const id = (await redis.get(key)) ?? undefined;
      log.debug(`Pagination id for query (${query.length}): ${id}`);
      const res = await api.v2.search(query, {
        'max_results': 100,
        'since_id': id,
        'tweet.fields': TWEET_FIELDS,
        'expansions': TWEET_EXPANSIONS,
        'user.fields': USER_FIELDS,
      });
      toCreateQueue(res, queue);
      if (res.meta.next_token) await redis.set(key, res.meta.newest_id);
    })
  );
  await executeCreateQueue(queue);
}

export const action: ActionFunction = async ({ params, request }) => {
  const invocationId = nanoid(5);
  console.time(`src-id-loader-${invocationId}`);
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching tweets for ${params.src} (${params.id})...`);
  const { api, session } = await getClient(request);
  switch (params.src) {
    case 'clusters': {
      log.info(`Fetching cluster (${params.id}) from database...`);
      const cluster = await db.clusters.findUnique({
        where: { slug: params.id },
      });
      if (!cluster) throw new Response('Not Found', { status: 404 });
      // TODO: Sync cluster influencer scores on-demand.
      const { influencers } = await getBorgCollectiveInfluencers(cluster);
      const usernames = influencers.map(
        (influencer) => influencer.social_account.social_account.screen_name
      );
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
      const parse = (_: unknown, value: unknown) =>
        typeof value === 'bigint' ? `${value.toString()}n` : value;
      log.info(`Fetching ${n} rekt scores...`);
      const res = await fetch(
        `https://feed.rekt.news/api/v1/parlor/crypto/0/${n}`
      );
      const influencers = (await res.json()) as RektInfluencer[];
      log.info(`Fetching ${influencers.length} rekt users...`);
      const splits: RektInfluencer[][] = [];
      while (json.length) splits.push(influencers.splice(0, 100));
      const usersToCreate: User[] = [];
      const scoresToCreate: Rekt[] = [];
      await Promise.all(
        splits.map(async (scores) => {
          const data = await api.v2.usersByUsernames(
            scores.map((r) => r.screen_name),
            { 'user.fields': USER_FIELDS }
          );
          log.trace(`Fetched users: ${JSON.stringify(data, parse, 2)}`);
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
          log.warn(
            `Missing user data for: ${JSON.stringify(missing, parse, 2)}`
          );
          rekt.filter((r) => r.user_id).forEach((r) => scoresToCreate.push(r));
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
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { headers });
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

  const location = useLocation();
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
      (transition.location.pathname !== location.pathname ||
        transition.location.search !== location.search)
    ) {
      // Queue a recalculation of all the items loaded into the next page.
      prevLength.current = 0;
    }
  }, [transition.state, transition.location, tweets.length, location]);

  const { syncing, indicator } = useSync();

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
