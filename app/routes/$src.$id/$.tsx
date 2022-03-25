import type { ActionFunction, LoaderFunction } from 'remix';
import { Link, json, useFetchers, useLoaderData, useLocation } from 'remix';
import invariant from 'tiny-invariant';

import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  USER_FIELDS,
  executeCreateQueue,
  getTwitterClientForUser,
  toCreateQueue,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { getLoggedInSession, log } from '~/utils.server';
import { getTweetRepliesByIds, getTweetsByIds } from '~/query.server';
import CloseIcon from '~/icons/close';
import Empty from '~/components/empty';
import type { TweetFull } from '~/types';
import TweetItem from '~/components/tweet';

export type LoaderData = { tweet: TweetFull; replies: TweetFull[] }[];

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params['*'], 'expected params.*');
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  const tweetIds = params['*'].split('/');
  const [tweets, replies] = await Promise.all([
    getTweetsByIds(tweetIds, uid),
    getTweetRepliesByIds(tweetIds, uid),
  ]);
  const data = tweetIds.map((tweetId) => ({
    tweet: tweets.find((tweet) => tweet.id === tweetId) as TweetFull,
    replies: replies.filter((reply) => reply.replied_to === tweetId),
  }));
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>(data, { headers });
};

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params['*'], 'expected params.*');
  const tweetId = params['*'].split('/').pop();
  log.info(`Getting replies to tweet (${tweetId})...`);
  const { session, uid } = await getLoggedInSession(request);
  const { api } = await getTwitterClientForUser(uid);
  const query = `is:reply conversation_id:${tweetId}`;
  const res = await api.v2.search(query, {
    'tweet.fields': TWEET_FIELDS,
    'expansions': TWEET_EXPANSIONS,
    'user.fields': USER_FIELDS,
    'max_results': 100,
  });
  await executeCreateQueue(toCreateQueue(res));
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};

export default function TweetPage() {
  const data = useLoaderData<LoaderData>();
  const { pathname } = useLocation();
  const fetchers = useFetchers();
  return data.map(({ tweet, replies }) => (
    <section className='flex-none w-[32rem] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto'>
      <header className='z-30 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative'>
        <Link
          to={pathname.replaceAll(`/${tweet.id}`, '')}
          className='z-30 absolute top-1.5 right-1.5 p-2 block rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors'
        >
          <CloseIcon className='w-5 h-5 fill-current' />
        </Link>
        <TweetItem tweet={tweet} />
      </header>
      <ol>
        {replies.map((reply) => (
          <TweetItem tweet={reply} key={reply.id} />
        ))}
        {fetchers.some((f) => f.submission?.action.endsWith(tweet.id)) &&
          Array(3)
            .fill(null)
            .map((_, idx) => <TweetItem key={idx} />)}
      </ol>
      {!fetchers.some((f) => f.submission?.action.endsWith(tweet.id)) &&
        !replies.length && (
          <Empty className='flex-1 m-5'>NO REPLIES TO SHOW</Empty>
        )}
    </section>
  ));
}
