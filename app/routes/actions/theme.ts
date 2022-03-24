import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';

import { commitSession, getSession } from '~/session.server';
import { isTheme } from '~/theme';

export const action: ActionFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'));
  const requestText = await request.text();
  const form = new URLSearchParams(requestText);
  const theme = form.get('theme');

  if (!isTheme(theme)) {
    return json({
      success: false,
      message: `theme value of ${theme} is not a valid theme`,
    });
  }

  session.set('theme', theme);
  return json(
    { success: true },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export const loader: LoaderFunction = () => redirect('/', { status: 404 });
