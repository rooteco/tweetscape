import { Link, useLoaderData, useLocation } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';
import invariant from 'tiny-invariant';
import { json } from '@remix-run/node';

import type { TweetFull, TweetJS } from '~/prototype/types';
import { commitSession, getSession } from '~/prototype/session.server';
import { getTweetRepliesByIds, getTweetsByIds } from '~/prototype/query.server';
import { getUserIdFromSession, log } from '~/prototype/utils.server';
import CloseIcon from '~/prototype/icons/close';
import Column from '~/prototype/components/column';
import Empty from '~/prototype/components/empty';
import TweetItem from '~/prototype/components/tweet';
import useSync from '~/prototype/hooks/sync';
import { wrapTweet } from '~/prototype/types';

export type LoaderData = { tweet: TweetJS; replies: TweetJS[] }[];

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params['*'], 'expected params.*');
  const session = await getSession(request.headers.get('Cookie'));
  const url = new URL(request.url);
  session.set('href', `${url.pathname}${url.search}`);
  const uid = getUserIdFromSession(session);
  const tweetIds = params['*'].split('/').map((id) => BigInt(id));
  log.info(
    `Fetching ${
      tweetIds.length
    } tweets (${tweetIds.join()}) and their replies...`
  );
  const [tweets, replies] = await Promise.all([
    getTweetsByIds(tweetIds, uid),
    getTweetRepliesByIds(tweetIds, uid),
  ]);
  log.info(`Fetched ${tweets.length} tweets and ${replies.length} replies.`);
  const data = tweetIds.map((tweetId) => ({
    tweet: wrapTweet(tweets.find((t) => t.id === tweetId) as TweetFull),
    replies: replies
      .filter((r) => r.refs?.some((f) => f?.referenced_tweet_id === tweetId))
      .map(wrapTweet),
  }));
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(data, { headers });
};

const fallback = Array(10)
  .fill(null)
  .map((_, idx) => <TweetItem key={idx} />);

function Section({ tweet, replies }: LoaderData[number]) {
  const { pathname } = useLocation();
  const { syncing, reloading, indicator } = useSync(`/sync/${tweet.id}`);
  return (
    <Column className='w-[36rem] border-r border-gray-200 dark:border-gray-800'>
      <header className='z-30 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow'>
        <nav className='p-1.5 flex items-stretch border-b border-gray-200 dark:border-gray-800'>
          <Link
            to={pathname.replaceAll(`/${tweet.id}`, '')}
            className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          >
            <CloseIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
            <span>Close</span>
          </Link>
          {indicator}
        </nav>
        <TweetItem tweet={tweet} />
      </header>
      <ol>
        {replies.map((reply) => (
          <TweetItem tweet={reply} key={reply.id.toString()} />
        ))}
        {(syncing || reloading) && fallback}
      </ol>
      {!syncing && !reloading && !replies.length && (
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
