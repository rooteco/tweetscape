import type { ActionFunction, LoaderFunction } from 'remix';
import { json, useLoaderData } from 'remix';
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
import { getTweet } from '~/query.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(params.tweet, 'expected params.tweet');
  const tweet = await getTweet(params.tweet, uid);
  const headers = { 'Set-Cookie': await commitSession(session) };
  log.info(`Found tweet: ${JSON.stringify(tweet, null, 2)}`);
  return json<TweetFull>(tweet, { headers });
};

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.tweet, 'expected params.tweet');
  const { session, uid } = await getLoggedInSession(request);
  const { api } = await getTwitterClientForUser(uid);
  const query = `is:reply conversation_id:${params.tweet}`;
  const res = await api.v2.search(query, {
    'tweet.fields': TWEET_FIELDS,
    'expansions': TWEET_EXPANSIONS,
    'user.fields': USER_FIELDS,
  });
  await executeCreateQueue(toCreateQueue(res));
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};

export default function TweetPage() {
  const data = useLoaderData<TweetFull>();
  return (
    <section className='flex-none w-[32rem] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto'>
      <TweetItem {...data} />
    </section>
  );
}
