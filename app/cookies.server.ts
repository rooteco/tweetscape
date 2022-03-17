import { createCookie } from 'remix';

// Restore the last-visited cluster and filter + sort combo when visiting /
export const href = createCookie('href', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET as string],
});

// A random string sent along with OAuth2 requests to protect against CSRF.
// @see {@link https://auth0.com/docs/secure/attack-protection/state-parameters}
// The required PKCE parameter (a random secret for each request to Twitter).
// @see {@link https://www.oauth.com/oauth2-servers/pkce/authorization-request}
export const oauth = createCookie('oauth', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET as string],
});
