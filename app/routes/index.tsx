import type { LoaderFunction } from 'remix';
import format from 'pg-format';
import { redirect } from 'remix';

import type { Influencer, Token } from '~/types';
import { href, oauth } from '~/cookies.server';
import { execute } from '~/db.server';
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
        const userRes = await fetch(
          'https://api.twitter.com/2/users/me?user.fields=id,name,username,created_at,profile_image_url,public_metrics',
          {
            headers: { Authorization: `Bearer ${data.access_token}` },
          }
        );
        const user = (await userRes.json()) as Influencer;
        log.info(`User: ${JSON.stringify(user, null, 2)}`);
        //const values = [
        //user.id,
        //data.token_type,
        //data.expires_in,
        //data.access_token,
        //data.scope,
        //data.refresh_token,
        //new Date(),
        //new Date(),
        //];
        //const query = format(
        //`
        //INSERT INTO tokens (
        //"influencer_id",
        //"token_type",
        //"expires_in",
        //"access_token",
        //"scope",
        //"refresh_token",
        //"created_at",
        //"updated_at"
        //) VALUES %L ON CONFLICT (refresh_token) DO UPDATE SET (
        //"token_type",
        //"expires_in",
        //"access_token",
        //"scope",
        //"updated_at"
        //) = ROW (excluded.*) WHERE tokens IS DISTINCT FROM excluded;
        //`,
        //[values]
        //);
        //log.info(`Inserting OAuth2 access token: ${query}`);
        //await execute(query);
      }
    }
  }
  const cookie = (await href.parse(request.headers.get('cookie'))) as string;
  return redirect(cookie ?? '/tesla');
};
