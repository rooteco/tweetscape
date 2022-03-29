import { Link, json, useFetchers, useLoaderData, useLocation } from 'remix';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';

import { commitSession, getSession } from '~/session.server';
import { getTweetRepliesByIds, getTweetsByIds } from '~/query.server';
import BoltIcon from '~/icons/bolt';
import CloseIcon from '~/icons/close';
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
  const uid = session.get('uid') as string | undefined;
  const tweetIds = params['*'].split('/');
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
    <section className='flex-none w-[32rem] flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-y-scroll'>
      <header className='z-30 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow'>
        <nav className='px-3 py-1.5 border-b border-gray-200 dark:border-gray-800'>
          <Link
            to={pathname.replaceAll(`/${tweet.id}`, '')}
            className='inline-flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          >
            <CloseIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
            <span>Close</span>
          </Link>
          <div
            className={cn(
              'ml-1.5 inline-flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6',
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
          <TweetItem tweet={reply} key={reply.id} />
        ))}
        {syncing && fallback}
      </ol>
      {!syncing && !replies.length && (
        <Empty className='flex-1 m-5'>No replies to show</Empty>
      )}
    </section>
  );
}

export default function TweetPage() {
  const data = useLoaderData<LoaderData>();
  return data.map(({ tweet, replies }) => (
    <Section tweet={tweet} replies={replies} key={tweet.id} />
  ));
}
