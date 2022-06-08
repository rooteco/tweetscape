import type { ActionFunction } from '@remix-run/node';

import { destroySession, getSession } from '~/prototype/session.server';

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const headers = { 'Set-Cookie': await destroySession(session) };
  return new Response('Logout Success', { headers });
};
