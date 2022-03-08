import { createCookie } from 'remix';

export const topic = createCookie('topic', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET],
});
