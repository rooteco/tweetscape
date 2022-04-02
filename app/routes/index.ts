import type { LoaderFunction } from 'remix';

import { TwitterApi, USER_FIELDS } from '~/twitter.server';
import { getBaseURL, log, redirectToLastVisited } from '~/utils.server';
import { db } from '~/db.server';
import { getSession } from '~/session.server';

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
      const { data: user } = await api.v2.me({ 'user.fields': USER_FIELDS });
      log.info(`Upserting user ${user.name} (@${user.username})...`);
      const user = {
        id: user.id,
        name: user.name,
        username: user.username,
        profile_image_url: user.profile_image_url,
        followers_count: user.public_metrics?.followers_count,
        following_count: user.public_metrics?.following_count,
        tweets_count: user.public_metrics?.tweet_count,
        created_at: user.created_at,
        updated_at: new Date(),
      };
      await db.users.upsert({
        create: user,
        update: user,
        where: { id: user.id },
      });
      log.info(`Upserting token for ${user.name} (@${user.username})...`);
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
      log.info(`Setting session uid for ${user.name} (@${user.username})...`);
      session.set('uid', user.id);
    }
  }
  return redirectToLastVisited(request, session);
};
