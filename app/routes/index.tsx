import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { href } from '~/cookies.server';

export const loader: LoaderFunction = async ({ request }) => {
  const cookie = (await href.parse(request.headers.get('cookie'))) as string;
  return redirect(cookie ?? '/tesla');
};
