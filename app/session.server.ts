import { createCookieSessionStorage } from 'remix';

// `href` - restore the last-visited cluster, filter, etc. when visiting /
// `state` - a random string sent with OAuth2 requests to protect against CSRF
// @see {@link https://auth0.com/docs/secure/attack-protection/state-parameters}
// `codeVerifier` - the required PKCE parameter (a random secret)
// @see {@link https://www.oauth.com/oauth2-servers/pkce/authorization-request}
export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: 'session',
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
      secrets: [process.env.COOKIE_SECRET as string],
    },
  });
