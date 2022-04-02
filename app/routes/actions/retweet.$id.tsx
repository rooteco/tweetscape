import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import { getLoggedInSession, log } from '~/utils.server';
import {
  getTwitterClientForUser,
  handleTwitterApiError,
} from '~/twitter.server';
import { commitSession } from '~/session.server';
import { db } from '~/db.server';
import { invalidate } from '~/swr.server';

export const action: ActionFunction = async ({ request, params }) => {
  try {
    invariant(params.id, 'expected params.id');
    const { session, uid } = await getLoggedInSession(request);
    const { api } = await getTwitterClientForUser(uid);
    const formData = await request.formData();
    const query = { tweet_id: BigInt(params.id), user_id: BigInt(uid) };
    switch (formData.get('action')) {
      case 'post': {
        log.info(`Retweeting tweet (${params.id}) for user (${uid})...`);
        await api.v2.retweet(uid, params.id);
        log.info(`Inserting retweet for (${params.id}) by user (${uid})...`);
        await db.retweets.upsert({
          create: query,
          update: {},
          where: { tweet_id_user_id: query },
        });
        break;
      }
      case 'delete': {
        log.info(`Unretweeting tweet (${params.id}) for user (${uid})...`);
        await api.v2.unretweet(uid, params.id);
        log.info(`Deleting retweet for (${params.id}) by user (${uid})...`);
        // I have to use `deleteMany` to be idempotent... otherwise a successive
        // call to `delete()` may cause a `RecordNotFound` exception.
        await db.retweets.deleteMany({ where: query });
        break;
      }
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
    await invalidate(uid);
    const headers = { 'Set-Cookie': await commitSession(session) };
    return new Response('Success', { headers });
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
