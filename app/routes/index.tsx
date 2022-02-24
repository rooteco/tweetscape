import { redirect } from 'remix';
import type { LoaderFunction } from 'remix';

import { topic } from '~/cookies.server';

export const loader: LoaderFunction = async ({ request }) => {
  const cookie = await topic.parse(request.headers.get('cookie'));
  return redirect(`/${cookie || 'eth'}`);
}
