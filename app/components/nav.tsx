import { Link, useFetcher, useMatches } from 'remix';

import BirdIcon from '~/icons/bird';
import FireIcon from '~/icons/fire';
import type { LoaderData } from '~/root';
import LogoutIcon from '~/icons/logout';
import OpenInNewIcon from '~/icons/open-in-new';
import Sync from '~/components/sync';
import Switcher from '~/components/switcher';
import ThemeSwitcher from '~/components/theme-switcher';

export default function Nav() {
  const root = useMatches()[0].data as LoaderData | undefined;
  const fetcher = useFetcher();
  return (
    <nav className='flex fixed p-1.5 top-1.5 left-1/2 -translate-x-1/2 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900 z-40'>
      <Switcher />
      {root?.user && (
        <button
          type='button'
          className='mr-1.5 disabled:cursor-wait flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          onClick={() =>
            fetcher.submit(null, { method: 'patch', action: '/logout' })
          }
          disabled={fetcher.state !== 'idle'}
        >
          <LogoutIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          <span>Logout</span>
        </button>
      )}
      {!root?.user && (
        <Link
          className='mr-1.5 flex truncate items-center text-white text-xs bg-sky-500 rounded px-2 h-6'
          to='/oauth'
        >
          <BirdIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-white' />
          <span>Login with Twitter</span>
        </Link>
      )}
      {root?.user && <Sync />}
      <Link
        prefetch='intent'
        className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        to='/changelog'
      >
        <FireIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
        <span>Changelog</span>
      </Link>
      <ThemeSwitcher />
      <a
        className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        href='https://github.com/rooteco/tweetscape'
        target='_blank'
        rel='noopener noreferrer'
      >
        <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
        <span>GitHub</span>
      </a>
      <a
        className='flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        href='https://discord.gg/3KYQBJwRSS'
        target='_blank'
        rel='noopener noreferrer'
      >
        <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
        <span>Community</span>
      </a>
    </nav>
  );
}
