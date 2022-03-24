import type { ActionFunction } from 'remix';

import { log, redirectToLastVisited } from '~/utils.server';
import { getSession } from '~/session.server';
import { isTheme } from '~/theme';

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const requestText = await request.text();
  const form = new URLSearchParams(requestText);
  const theme = form.get('theme');
  if (isTheme(theme)) {
    log.info(`Setting theme cookie (${theme})...`);
    session.set('theme', theme);
  }
  return redirectToLastVisited(request, session, false);
};
