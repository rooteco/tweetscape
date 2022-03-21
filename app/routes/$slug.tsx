import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

export const loader: LoaderFunction = ({ params }) =>
  redirect(`/clusters/${params.slug ?? 'ethereum'}`);
