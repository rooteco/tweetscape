import { createCookie } from 'remix';

declare var COOKIE_SECRET: string;
export const topic = createCookie('topic', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [COOKIE_SECRET],
});
