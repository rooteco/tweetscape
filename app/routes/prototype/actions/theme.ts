import type { ActionFunction } from '@remix-run/node';

import {
  commitSession,
  getSession,
} from '~/prototype/prototype/session.server';
import { isTheme } from '~/prototype/prototype/theme';
import { log } from '~/prototype/prototype/utils.server';

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const requestText = await request.text();
  const form = new URLSearchParams(requestText);
  const theme = form.get('theme');
  if (isTheme(theme)) {
    log.info(`Setting theme cookie (${theme})...`);
    session.set('theme', theme);
  }
  const headers = { 'Set-Cookie': await commitSession(session) };
  return new Response('Success', { headers });
};
