import type { Hash } from 'crypto';
import { createHash } from 'crypto';

import type { LoaderFunction } from 'remix';
import { nanoid } from 'nanoid';
import { redirect } from 'remix';

import { oauth } from '~/cookies.server';

// Base64-URL-encoding is a minor variation on the typical Base64 encoding
// method. It starts with the same Base64-encoding method available in most
// programming languages, but uses URL-safe characters instead.
// @see {@link https://www.oauth.com/oauth2-servers/pkce/authorization-request}
function base64UrlEncode(hash: Hash) {
  return hash
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const loader: LoaderFunction = async ({ request }) => {
  const stateId = nanoid();
  const url = new URL(request.url);
  const codeVerifier = nanoid(128);
  const codeHash = createHash('sha256').update(codeVerifier);
  const cookie = await oauth.serialize({ stateId, codeVerifier });
  const params = {
    state: stateId,
    response_type: 'code',
    client_id: process.env.OAUTH_CLIENT_ID,
    redirect_uri: encodeURIComponent(`${url.protocol}//${url.host}`),
    scope: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'follows.read',
      'follows.write',
      'offline.access',
      'like.read',
      'like.write',
      'list.read',
      'list.write',
    ].join('%20'),
    code_challenge: base64UrlEncode(codeHash),
    code_challenge_method: 'S256',
  };
  const search = Object.entries(params)
    .map((p) => p.join('='))
    .join('&');
  const { href } = new URL(`https://twitter.com/i/oauth2/authorize?${search}`);
  return redirect(href, { headers: { 'Set-Cookie': cookie } });
};
