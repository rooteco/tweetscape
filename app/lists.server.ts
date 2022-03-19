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
  log.info(`Fetching followed lists for ${context}...`);
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
  log.info(`Inserting ${owners.length} followed list owners for ${context}...`);
  await db.influencers.createMany({ data: owners, skipDuplicates: true });
  const lists = res.lists.map(toList);
  log.info(`Inserting ${lists.length} followed lists for ${context}...`);
  log.debug(`User (${uid}) followed lists: ${JSON.stringify(lists, null, 2)}`);
  await db.lists.createMany({ data: lists, skipDuplicates: true });
  log.info(`Inserting ${lists.length} list follows for ${context}...`);
  await db.list_followers.createMany({
    data: lists.map((l) => ({ influencer_id: uid, list_id: l.id })),
    skipDuplicates: true,
  });
  log.info(`Fetching owned lists for ${context}...`);
  const owned = await api.v2.listsOwned(uid, {
    'list.fields': [
      'created_at',
      'follower_count',
      'member_count',
      'private',
      'description',
      'owner_id',
    ],
  });
  const ownedLists = owned.lists.map(toList);
  log.info(`Inserting ${lists.length} owned lists for ${context}...`);
  log.debug(
    `User (${uid}) owned lists: ${JSON.stringify(ownedLists, null, 2)}`
  );
  await db.lists.createMany({ data: ownedLists, skipDuplicates: true });
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Sync Success', { status: 200, headers });
};
