import {
  Link,
  NavLink,
  useFetcher,
  useMatches,
  useResolvedPath,
  useTransition,
} from 'remix';
import cn from 'classnames';
import { useState } from 'react';

import BirdIcon from '~/icons/bird';
import Empty from '~/components/empty';
import FireIcon from '~/icons/fire';
import type { LoaderData } from '~/root';
import LogoutIcon from '~/icons/logout';
import MenuIcon from '~/icons/menu';
import MenuOpenIcon from '~/icons/menu-open';
import OpenInNewIcon from '~/icons/open-in-new';
import Sync from '~/components/sync';
import ThemeSwitcher from '~/components/theme-switcher';

function SectionLink({ to, children }: { to: string; children: string }) {
  const transition = useTransition();
  const path = useResolvedPath(to);
  return (
    <NavLink
      key={to}
      prefetch='intent'
      className={({ isActive }) =>
        cn('block pl-3 py-0.5 my-1 -ml-px border-l border-transparent', {
          'border-current font-semibold dark:text-sky-400 text-sky-500':
            isActive,
          'text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition hover:text-slate-800 dark:hover:text-slate-200':
            !isActive,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname,
        })
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}

type SectionProps = { header: string; links: { to: string; name: string }[] };
function Section({ header, links }: SectionProps) {
  return (
    <section className='text-sm mt-5'>
      <h2 className='mb-2.5 font-semibold'>{header}</h2>
      <div className='border-l border-slate-200 dark:border-slate-800'>
        {links.map(({ to, name }) => (
          <SectionLink key={to} to={to}>
            {name}
          </SectionLink>
        ))}
      </div>
    </section>
  );
}

export default function Header() {
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = root?.clusters ?? [];
  const lists = root?.lists ?? [];
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  return (
    <nav
      className={cn(
        'shrink-0 h-full border-r border-slate-200 dark:border-slate-800 pl-5 pt-5 pb-5 overflow-auto lg:static absolute w-64 inset-y-0 lg:shadow-none shadow-2xl transition-[left,box-shadow] duration-[0.25s,0.15s] ease-out bg-white dark:bg-slate-900 z-40',
        { 'left-0': open, '-left-64': !open }
      )}
    >
      <button
        type='button'
        className='lg:hidden fixed top-0 left-0 w-14 h-14 inline-flex items-center justify-center'
        onClick={() => setOpen((prev) => !prev)}
      >
        {open && <MenuOpenIcon className='fill-current' />}
        {!open && <MenuIcon className='fill-current' />}
      </button>
      <h1 className='font-semibold text-4xl tracking-tighter mb-3.5 lg:mt-0 mt-6'>
        tweetscape
      </h1>
      <div className='h-6'>
        {root?.user && (
          <button
            type='button'
            className='disabled:cursor-wait mr-1.5 inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
            onClick={() =>
              fetcher.submit(null, { method: 'patch', action: '/logout' })
            }
            disabled={fetcher.state !== 'idle'}
          >
            <LogoutIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
            <span>Logout</span>
          </button>
        )}
        {!root?.user && (
          <Link
            className='inline-flex truncate items-center text-white text-xs bg-sky-500 rounded px-2 h-6'
            to='/oauth'
          >
            <BirdIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-white' />
            <span>Login with Twitter</span>
          </Link>
        )}
        {root?.user && <Sync />}
      </div>
      <div className='h-6 mt-1.5'>
        <Link
          prefetch='intent'
          className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
          to='/changelog'
        >
          <FireIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          <span>Changelog</span>
        </Link>
        <ThemeSwitcher />
      </div>
      <div className='h-6 mt-1.5'>
        <a
          className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
          href='https://github.com/rooteco/tweetscape'
          target='_blank'
          rel='noopener noreferrer'
        >
          <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          <span>GitHub</span>
        </a>
        <a
          className='ml-1.5 inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
          href='https://discord.gg/3KYQBJwRSS'
          target='_blank'
          rel='noopener noreferrer'
        >
          <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          <span>Community</span>
        </a>
      </div>
      {!!clusters.length && (
        <Section
          header='Hive clusters'
          links={clusters.map((c) => ({
            name: c.name,
            to: `/clusters/${c.slug}`,
          }))}
        />
      )}
      <Section
        header='Rekt parlors'
        links={[{ name: 'Crypto', to: '/rekt/crypto' }]}
      />
      {!root?.user && (
        <section className='text-sm mt-5 pr-5'>
          <h2 className='mb-2.5 font-semibold'>Your lists</h2>
          <Empty className='min-w-full w-0 h-[50vh] max-h-96'>
            <p>
              To view tweets from your own lists,{' '}
              <Link className='underline' to='/oauth'>
                login
              </Link>
              .
            </p>
          </Empty>
        </section>
      )}
      {!!lists.length && (
        <Section
          header='Your lists'
          links={lists.map((l) => ({
            name: l.name,
            to: `/lists/${l.id}`,
          }))}
        />
      )}
    </nav>
  );
}
