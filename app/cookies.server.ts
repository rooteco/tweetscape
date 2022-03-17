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
export const state = createCookie('state', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET as string],
});
