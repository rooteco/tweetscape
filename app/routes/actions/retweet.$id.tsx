import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import { getLoggedInSession, log, redirectToLastVisited } from '~/utils.server';
import {
  getTwitterClientForUser,
  handleTwitterApiError,
} from '~/twitter.server';
import { db } from '~/db.server';

export const action: ActionFunction = async ({ request, params }) => {
  try {
    invariant(params.id, 'expected params.id');
    const { session, uid } = await getLoggedInSession(request);
    const { api } = await getTwitterClientForUser(uid);
    const formData = await request.formData();
    switch (formData.get('action')) {
      case 'post': {
        log.info(`Retweeting tweet (${params.id}) for user (${uid})...`);
        await api.v2.retweet(uid, params.id);
        log.info(`Inserting retweet for (${params.id}) by user (${uid})...`);
        await db.retweets.upsert({
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
        log.info(`Unretweeting tweet (${params.id}) for user (${uid})...`);
        await api.v2.unretweet(uid, params.id);
        log.info(`Deleting retweet for (${params.id}) by user (${uid})...`);
        // I have to use `deleteMany` to be idempotent... otherwise a successive
        // call to `delete()` may cause a `RecordNotFound` exception.
        await db.retweets.deleteMany({
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
    return await redirectToLastVisited(request, session, false);
  } catch (e) {
    return handleTwitterApiError(e);
  }
};
