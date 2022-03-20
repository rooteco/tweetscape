import type { ActionFunction } from 'remix';

import { destroySession, getSession } from '~/session.server';

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const headers = { 'Set-Cookie': await destroySession(session) };
  return new Response('Logout Success', { headers });
};
