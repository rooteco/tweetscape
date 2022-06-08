import type { ActionFunction } from '@remix-run/node';
import invariant from 'tiny-invariant';

import {
  TWEET_EXPANSIONS,
  TWEET_FIELDS,
  USER_FIELDS,
  executeCreateQueue,
  getClient,
  toCreateQueue,
} from '~/prototype/twitter.server';
import { commitSession } from '~/prototype/session.server';
import { invalidateCacheForUser } from '~/prototype/swr.server';
import { log } from '~/prototype/utils.server';

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.tweet, 'expected params.tweet');
  log.info(`Getting replies to tweet (${params.tweet})...`);
  const { session, api, uid } = await getClient(request);
  const query = `is:reply conversation_id:${params.tweet}`;
  const res = await api.v2.search(query, {
    'tweet.fields': TWEET_FIELDS,
    'expansions': TWEET_EXPANSIONS,
    'user.fields': USER_FIELDS,
    'max_results': 100,
  });
  await executeCreateQueue(toCreateQueue(res));
  // TODO: Invalidate cached responses for this tweet's replies.
  if (uid) await invalidateCacheForUser(uid);
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
