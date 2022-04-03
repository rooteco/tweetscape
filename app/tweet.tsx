import { Link, json, useFetchers, useLoaderData, useLocation } from 'remix';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import { commitSession, getSession } from '~/session.server';
import { getTweetRepliesByIds, getTweetsByIds } from '~/query.server';
import { getUserIdFromSession, log } from '~/utils.server';
import BoltIcon from '~/icons/bolt';
import CloseIcon from '~/icons/close';
import Column from '~/components/column';
import Empty from '~/components/empty';
import SyncIcon from '~/icons/sync';
import { TimeAgo } from '~/components/timeago';
import type { TweetFull } from '~/types';
import TweetItem from '~/components/tweet';

export type LoaderData = { tweet: TweetFull; replies: TweetFull[] }[];

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params['*'], 'expected params.*');
  const session = await getSession(request.headers.get('Cookie'));
  const url = new URL(request.url);
  session.set('href', `${url.pathname}${url.search}`);
  const uid = getUserIdFromSession(session);
  const tweetIds = params['*'].split('/').map((id) => BigInt(id));
  log.info(`Fetching ${tweetIds.length} tweets and their replies...`);
  const [tweets, replies] = await Promise.all([
    getTweetsByIds(tweetIds, uid),
    getTweetRepliesByIds(tweetIds, uid),
  ]);
  const data = tweetIds.map((tweetId) => ({
    tweet: tweets.find((tweet) => tweet.id === tweetId) as TweetFull,
    replies: replies.filter((reply) =>
      reply.refs?.some((r) => r?.referenced_tweet_id === tweetId)
    ),
  }));
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(data, { headers });
};

const fallback = Array(10)
  .fill(null)
  .map((_, idx) => <TweetItem key={idx} />);

function Section({ tweet, replies }: LoaderData[number]) {
  const { pathname } = useLocation();
  const fetchers = useFetchers();
  const syncing = useMemo(
    () => fetchers.some((f) => f.submission?.action === `/sync/${tweet.id}`),
    [fetchers, tweet.id]
  );
  const prevSyncing = useRef(syncing);
  const [lastSynced, setLastSynced] = useState<Date>();
  useEffect(() => {
    if (!syncing && prevSyncing.current)
      setLastSynced((prev) => prev ?? new Date());
    prevSyncing.current = syncing;
  }, [syncing]);
  return (
    <Column className='w-[36rem] border-r border-gray-200 dark:border-gray-800'>
      <header className='z-30 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow'>
        <nav className='p-1.5 flex items-stretch border-b border-gray-200 dark:border-gray-800'>
          <Link
            to={pathname.replaceAll(`/${tweet.id}`, '')}
            className='flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          >
            <CloseIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
            <span>Close</span>
          </Link>
          <div
            className={cn(
              'ml-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6',
              { 'cursor-wait': syncing, 'cursor-default': !syncing }
            )}
          >
            {syncing && (
              <>
                <SyncIcon />
                <span>Syncing</span>
              </>
            )}
            {!syncing && (
              <>
                <BoltIcon />
                <span>
                  Synced{' '}
                  <TimeAgo
                    datetime={lastSynced ?? new Date()}
                    locale='en_short'
                  />
                </span>
              </>
            )}
          </div>
        </nav>
        <TweetItem tweet={tweet} />
      </header>
      <ol>
        {replies.map((reply) => (
          <TweetItem tweet={reply} key={reply.id.toString()} />
        ))}
        {syncing && fallback}
      </ol>
      {!syncing && !replies.length && (
        <Empty className='flex-1 m-5'>No replies to show</Empty>
      )}
    </Column>
  );
}

export default function TweetPage() {
  const data = useLoaderData<LoaderData>();
  return data.map(({ tweet, replies }) => (
    <Section tweet={tweet} replies={replies} key={tweet.id.toString()} />
  ));
}
