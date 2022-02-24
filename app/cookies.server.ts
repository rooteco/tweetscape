import { createCookie } from 'remix';

declare const COOKIE_SECRET: string;
export const topic = createCookie('topic', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [COOKIE_SECRET],
});
