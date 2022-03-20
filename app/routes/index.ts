import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { commitSession, getSession } from '~/session.server';
import { TwitterApi } from '~/twitter.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const stateId = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const session = await getSession(request.headers.get('Cookie'));
  if (stateId && code) {
    if (session.get('stateId') === stateId) {
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
        redirectUri: `${url.protocol}//${url.host}`,
      });
      log.info('Fetching logged in user from Twitter API...');
      const { data: user } = await api.v2.me({
        'user.fields': [
          'id',
          'name',
          'username',
          'profile_image_url',
          'public_metrics',
          'created_at',
        ],
      });
      log.info(`Upserting influencer ${user.name} (@${user.username})...`);
      const influencer = {
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
      await db.influencers.upsert({
        create: influencer,
        update: influencer,
        where: { id: influencer.id },
      });
      log.info(`Upserting token for ${user.name} (@${user.username})...`);
      const token = {
        influencer_id: influencer.id,
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
        where: { influencer_id: token.influencer_id },
      });
      log.info(`Setting session uid for ${user.name} (@${user.username})...`);
      session.set('uid', user.id);
    }
  }
  return redirect((session.get('href') as string) ?? '/clusters/tesla', {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
};
