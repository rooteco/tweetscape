import type { ActionFunction, LoaderFunction } from 'remix';
import { json, useLoaderData, useOutletContext } from 'remix';
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
import type { TweetFull } from '~/types';
import TweetItem from '~/components/tweet';
import { getTweetReplies } from '~/query.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(params.tweet, 'expected params.tweet');
  const replies = await getTweetReplies(params.tweet, uid);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<TweetFull[]>(replies, { headers });
};

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.tweet, 'expected params.tweet');
  log.info(`Getting replies to tweet (${params.tweet})...`);
  const { session, uid } = await getLoggedInSession(request);
  const { api } = await getTwitterClientForUser(uid);
  const query = `is:reply conversation_id:${params.tweet}`;
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
  const replies = useLoaderData<TweetFull[]>();
  const tweet = useOutletContext<TweetFull>();
  return (
    <section className='flex-none w-[32rem] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto'>
      <header className='z-30 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'>
        <TweetItem tweet={tweet} />
      </header>
      <ol>
        {replies.map((reply) => (
          <TweetItem tweet={reply} key={reply.id} />
        ))}
      </ol>
    </section>
  );
}
