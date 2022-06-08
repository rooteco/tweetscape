import type { ActionFunction } from '@remix-run/node';
import invariant from 'tiny-invariant';

import { getLoggedInSession, log } from '~/prototype/utils.server';
import {
  getTwitterClientForUser,
  handleTwitterApiError,
} from '~/prototype/twitter.server';
import { commitSession } from '~/prototype/session.server';
import { db } from '~/prototype/db.server';
import { invalidateCacheForUser } from '~/prototype/swr.server';

export const action: ActionFunction = async ({ request, params }) => {
  try {
    invariant(params.id, 'expected params.id');
    const { session, uid } = await getLoggedInSession(request);
    const { api } = await getTwitterClientForUser(uid);
    const formData = await request.formData();
    const query = { tweet_id: BigInt(params.id), user_id: BigInt(uid) };
    switch (formData.get('action')) {
      case 'post': {
        log.info(`Liking tweet (${params.id}) for user (${uid})...`);
        await api.v2.like(uid.toString(), params.id);
        log.info(`Inserting like for tweet (${params.id}) by user (${uid})...`);
        await db.likes.upsert({
          create: query,
          update: {},
          where: { tweet_id_user_id: query },
        });
        break;
      }
      case 'delete': {
        log.info(`Unliking tweet (${params.id}) for user (${uid})...`);
        await api.v2.unlike(uid.toString(), params.id);
        log.info(`Deleting like for tweet (${params.id}) by user (${uid})...`);
        // I have to use `deleteMany` to be idempotent... otherwise a successive
        // call to `delete()` may cause a `RecordNotFound` exception.
        await db.likes.deleteMany({ where: query });
        break;
      }
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
    await invalidateCacheForUser(uid);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Success', { headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
