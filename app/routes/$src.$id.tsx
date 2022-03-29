import type { LoaderFunction } from 'remix';
import { Outlet } from 'remix';

import Empty from '~/components/empty';
import Nav from '~/components/nav';
import { lang } from '~/utils.server';
import { useError } from '~/error';

export type LoaderData = { locale: string };

export const loader: LoaderFunction = ({ request }): LoaderData => ({
  locale: lang(request),
});

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <div className='w-full h-full min-h-full fixed inset-0 overflow-hidden flex items-stretch'>
      <Nav />
      <main className='flex flex-1 overflow-hidden'>
        <Empty className='flex-1 m-5'>
          <p>An unexpected runtime error occurred:</p>
          <p>{error.message}</p>
          <p className='mt-2'>
            Try logging out and in again. Or smash your keyboard; that sometimes
            helps. If you still have trouble, come and complain in{' '}
            <a
              className='underline'
              href='https://discord.gg/3KYQBJwRSS'
              target='_blank'
              rel='noopener noreferrer'
            >
              our Discord server
            </a>
            ; we’re always more than happy to help.
          </p>
        </Empty>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <div className='w-full h-full min-h-full fixed inset-0 overflow-hidden flex items-stretch'>
      <Nav />
      <main className='flex flex-1 overflow-hidden'>
        <Outlet />
      </main>
    </div>
  );
}
