import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import {
  TwitterV2IncludesHelper,
  getTwitterClientForUser,
  toInfluencer,
  toList,
} from '~/twitter.server';
import { commitSession, getSession } from '~/session.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  invariant(uid, 'expected session uid');
  const context = `user (${uid}) lists`;
  const api = await getTwitterClientForUser(uid);
  log.info(`Fetching lists for ${context}...`);
  const res = await api.v2.listFollowed(uid, {
    'list.fields': [
      'created_at',
      'follower_count',
      'member_count',
      'private',
      'description',
      'owner_id',
    ],
    'expansions': ['owner_id'],
    'user.fields': [
      'id',
      'name',
      'username',
      'profile_image_url',
      'public_metrics',
      'created_at',
    ],
  });
  const includes = new TwitterV2IncludesHelper(res);
  const owners = includes.users.map(toInfluencer);
  log.info(`Inserting ${owners.length} list owners for ${context}...`);
  await db.influencers.createMany({ data: owners, skipDuplicates: true });
  const lists = res.lists.map(toList);
  log.info(`Inserting ${lists.length} lists for ${context}...`);
  log.debug(`User (${uid}) lists: ${JSON.stringify(lists, null, 2)}`);
  await db.lists.createMany({ data: lists, skipDuplicates: true });
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
