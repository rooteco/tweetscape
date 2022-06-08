import type { LoaderFunction } from '@remix-run/node';

import { TwitterApi, USER_FIELDS } from '~/prototype/prototype/twitter.server';
import {
  getBaseURL,
  log,
  redirectToLastVisited,
} from '~/prototype/prototype/utils.server';
import { db } from '~/prototype/prototype/db.server';
import { getSession } from '~/prototype/prototype/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const stateId = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const session = await getSession(request.headers.get('Cookie'));
  if (stateId && code) {
    const storedStateId = session.get('stateId') as string;
    log.debug(`Checking if state (${stateId}) matches (${storedStateId})...`);
    if (storedStateId === stateId) {
      log.info('Logging in with Twitter OAuth2...');
      const client = new TwitterApi({
        clientId: process.env.OAUTH_CLIENT_ID as string,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
      });
      const {
        client: api,
        scope,
        accessToken,
        refreshToken,
        expiresIn,
      } = await client.loginWithOAuth2({
        code,
        codeVerifier: session.get('codeVerifier') as string,
        redirectUri: getBaseURL(request),
      });
      log.info('Fetching logged in user from Twitter API...');
      const { data } = await api.v2.me({ 'user.fields': USER_FIELDS });
      const context = `${data.name} (@${data.username})`;
      log.info(`Upserting user for ${context}...`);
      const user = {
        id: BigInt(data.id),
        name: data.name,
        username: data.username,
        profile_image_url: data.profile_image_url,
        followers_count: data.public_metrics?.followers_count,
        following_count: data.public_metrics?.following_count,
        tweets_count: data.public_metrics?.tweet_count,
        created_at: data.created_at,
        updated_at: new Date(),
      };
      await db.users.upsert({
        create: user,
        update: user,
        where: { id: user.id },
      });
      log.info(`Upserting token for ${context}...`);
      const token = {
        user_id: user.id,
        token_type: 'bearer',
        expires_in: expiresIn,
        access_token: accessToken,
        scope: scope.join(' '),
        refresh_token: refreshToken as string,
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.tokens.upsert({
        create: token,
        update: token,
        where: { user_id: token.user_id },
      });
      log.info(`Setting session uid (${user.id}) for ${context}...`);
      session.set('uid', user.id.toString());
    }
  }
  return redirectToLastVisited(request, session);
};
