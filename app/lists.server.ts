import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { json } from 'remix';

import { commitSession, getSession } from '~/session.server';
import type { List } from '~/types';
import { TwitterApi } from '~/twitter.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(uid, 'expected session uid');
  log.info(`Fetching token for user (${uid})...`);
  const token = await db.tokens.findUnique({ where: { influencer_id: uid } });
  invariant(token, `expected token for user (${uid})`);
  log.info(`Fetching lists for user (${uid})...`);
  const api = new TwitterApi(token.access_token);
  const { lists: data } = await api.v2.listsOwned(uid, {
    'list.fields': [
      'created_at',
      'follower_count',
      'member_count',
      'private',
      'description',
      'owner_id',
    ],
  });
  const lists = data.map((list) => ({
    ...(list as Omit<List, 'created_at'>),
    owner_id: uid,
    created_at: new Date(list.created_at as string),
  }));
  log.info(`Inserting lists for user (${uid})...`);
  await db.lists.createMany({ data: lists, skipDuplicates: true });
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<List[]>(lists, { headers });
};
