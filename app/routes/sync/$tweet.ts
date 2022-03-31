import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  TwitterApi,
  USER_FIELDS,
  executeCreateQueue,
  getTwitterClientForUser,
  toCreateQueue,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { log } from '~/utils.server';

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.tweet, 'expected params.tweet');
  log.info(`Getting replies to tweet (${params.tweet})...`);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  const api = uid
    ? (await getTwitterClientForUser(uid)).api
    : new TwitterApi(process.env.TWITTER_TOKEN as string);
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
