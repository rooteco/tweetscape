import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import { getLoggedInSession, log, redirectToLastVisited } from '~/utils.server';
import {
  getTwitterClientForUser,
  handleTwitterApiError,
} from '~/twitter.server';
import { db } from '~/db.server';
import { invalidate } from '~/swr.server';

export const action: ActionFunction = async ({ request, params }) => {
  try {
    invariant(params.id, 'expected params.id');
    const { session, uid } = await getLoggedInSession(request);
    const { api } = await getTwitterClientForUser(uid);
    const formData = await request.formData();
    switch (formData.get('action')) {
      case 'post': {
        log.info(`Liking tweet (${params.id}) for user (${uid})...`);
        await api.v2.like(uid, params.id);
        log.info(`Inserting like for tweet (${params.id}) by user (${uid})...`);
        await db.likes.upsert({
          create: { tweet_id: params.id, influencer_id: uid },
          update: {},
          where: {
            tweet_id_influencer_id: {
              tweet_id: params.id,
              influencer_id: uid,
            },
          },
        });
        break;
      }
      case 'delete': {
        log.info(`Unliking tweet (${params.id}) for user (${uid})...`);
        await api.v2.unlike(uid, params.id);
        log.info(`Deleting like for tweet (${params.id}) by user (${uid})...`);
        // I have to use `deleteMany` to be idempotent... otherwise a successive
        // call to `delete()` may cause a `RecordNotFound` exception.
        await db.likes.deleteMany({
          where: {
            tweet_id: params.id,
            influencer_id: uid,
          },
        });
        break;
      }
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
    await invalidate(uid);
    return await redirectToLastVisited(request, session, false);
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
