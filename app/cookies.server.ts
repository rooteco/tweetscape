import { createCookie } from 'remix';

export const href = createCookie('href', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  secrets: [process.env.COOKIE_SECRET as string],
});
