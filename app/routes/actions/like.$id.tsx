import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';

import { getLoggedInSession, log, redirectToLastVisited } from '~/utils.server';
import { db } from '~/db.server';
import { getTwitterClientForUser } from '~/twitter.server';

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.id, 'expected params.id');
  const { session, uid } = await getLoggedInSession(request);
  const { api } = await getTwitterClientForUser(uid);
  switch (request.method) {
    case 'POST': {
      log.info(`Liking tweet (${params.id}) for user (${uid})...`);
      await api.v2.like(uid, params.id);
      log.info(
        `Inserting new like for tweet (${params.id}) by user (${uid})...`
      );
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
    case 'DELETE': {
      log.info(`Unliking tweet (${params.id}) for user (${uid})...`);
      await api.v2.unlike(uid, params.id);
      log.info(`Deleting like for tweet (${params.id}) by user (${uid})...`);
      await db.likes.delete({
        where: {
          tweet_id_influencer_id: {
            tweet_id: params.id,
            influencer_id: uid,
          },
        },
      });
      break;
    }
    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
  return redirectToLastVisited(request, session);
};
