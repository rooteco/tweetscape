import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { href, oauth } from '~/cookies.server';
import { log } from '~/utils.server';

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
      log.info(`OAuth2: ${JSON.stringify(await res.json(), null, 2)}`);
    }
  }
  const cookie = (await href.parse(request.headers.get('cookie'))) as string;
  return redirect(cookie ?? '/tesla');
};
