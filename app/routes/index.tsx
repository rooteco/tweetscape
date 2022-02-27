import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { topic } from '~/cookies.server';

export const loader: LoaderFunction = async ({ request }) => {
  const cookie = (await topic.parse(request.headers.get('cookie'))) as string;
  return redirect(`/${cookie || 'tesla'}`);
};
