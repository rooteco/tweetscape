import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { href, oauth } from '~/cookies.server';
import type { Token } from '~/types';
import { TwitterApi } from '~/twitter.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';

type OAuthError = { error: string; error_description: string };
function isOAuthError(error: Token | OAuthError): error is OAuthError {
  return typeof (error as OAuthError).error === 'string';
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const stateId = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (stateId && code) {
    const oauthCookie = (await oauth.parse(request.headers.get('cookie'))) as {
      stateId: string;
      codeVerifier: string;
    };
    if (oauthCookie.stateId === stateId) {
      const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.OAUTH_CLIENT_ID as string,
        redirect_uri: `${url.protocol}//${url.host}`,
        code_verifier: oauthCookie.codeVerifier,
      }).toString();
      const endpoint = `https://api.twitter.com/2/oauth2/token?${params}`;
      log.info(`Fetching OAuth2 access token (${endpoint})...`);
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      });
      const data = (await res.json()) as Token | OAuthError;
      if (isOAuthError(data)) {
        log.error(`OAuth2 error (${data.error}): ${data.error_description}`);
      } else {
        log.info(`OAuth2 data: ${JSON.stringify(data, null, 2)}`);
        log.info('Fetching logged in user from Twitter...');
        const client = new TwitterApi(data.access_token);
        const { data: user } = await client.v2.me({
          'user.fields': [
            'id',
            'name',
            'username',
            'profile_image_url',
            'public_metrics',
            'created_at',
          ],
        });
        log.info(`Upserting influencer ${user.name} (${user.id})...`);
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
        log.info(`Upserting token for ${user.name} (${user.id})...`);
        const token = {
          ...data,
          influencer_id: influencer.id,
          created_at: new Date(),
          updated_at: new Date(),
        };
        await db.tokens.upsert({
          create: token,
          update: token,
          where: {
            influencer_id: token.influencer_id,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
          },
        });
      }
    }
  }
  const cookie = (await href.parse(request.headers.get('cookie'))) as string;
  return redirect(cookie ?? '/tesla');
};
