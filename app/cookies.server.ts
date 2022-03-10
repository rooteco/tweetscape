import { createCookie } from 'remix';

export const cluster = createCookie('cluster', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET],
});
