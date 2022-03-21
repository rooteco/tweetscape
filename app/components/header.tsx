import { Link, NavLink, useFetcher, useMatches, useTransition } from 'remix';
import cn from 'classnames';

import { Theme, useTheme } from '~/theme';
import BirdIcon from '~/icons/bird';
import DarkIcon from '~/icons/dark';
import Empty from '~/components/empty';
import LightIcon from '~/icons/light';
import type { LoaderData } from '~/root';
import LogoutIcon from '~/icons/logout';
import OpenInNewIcon from '~/icons/open-in-new';
import Sync from '~/components/sync';
import SystemIcon from '~/icons/system';

type SectionProps = { header: string; links: { to: string; name: string }[] };
function Section({ header, links }: SectionProps) {
  const transition = useTransition();
  return (
    <section className='text-sm mt-5'>
      <h2 className='mb-2.5 font-semibold'>{header}</h2>
      <div className='border-l border-slate-200 dark:border-slate-800'>
        {links.map(({ to, name }) => (
          <NavLink
            key={to}
            className={({ isActive }) =>
              cn('block pl-3 py-0.5 my-1 -ml-px border-l border-transparent', {
                'border-current font-semibold dark:text-sky-400 text-sky-500':
                  isActive,
                'text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition hover:text-slate-800 dark:hover:text-slate-200':
                  !isActive,
                'cursor-wait': transition.state !== 'idle',
              })
            }
            to={to}
          >
            {name}
          </NavLink>
        ))}
      </div>
    </section>
  );
}

export default function Header() {
  const [theme, setTheme] = useTheme();
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = root?.clusters ?? [];
  const lists = root?.lists ?? [];
  const fetcher = useFetcher();
  return (
    <nav className='shrink-0 h-full border-r border-slate-200 dark:border-slate-800 p-5 overflow-auto'>
      <h1 className='font-black text-4xl tracking-tight mb-2.5'>tweetscape</h1>
      <div className='h-6 w-60'>
        {root?.user && (
          <button
            type='button'
            className='disabled:cursor-wait mr-1.5 inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'
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
        <a
          className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'
          href='https://github.com/rooteco/tweetscape'
          target='_blank'
          rel='noopener noreferrer'
        >
          <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          <span>GitHub</span>
        </a>
        <button
          type='button'
          className='ml-1.5 inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'
          aria-pressed={theme === Theme.System ? 'mixed' : theme === Theme.Dark}
          onClick={() =>
            setTheme((prev) => {
              if (prev === undefined || prev === Theme.System)
                return Theme.Dark;
              if (prev === Theme.Dark) return Theme.Light;
              return Theme.System;
            })
          }
        >
          {theme === Theme.Dark && (
            <DarkIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          )}
          {theme === Theme.Light && (
            <LightIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          )}
          {(theme === undefined || theme === Theme.System) && (
            <SystemIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500' />
          )}
          <span>{Object.values(Theme)[theme ?? Theme.System]}</span>
        </button>
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
      {!root?.user && (
        <section className='text-sm mt-5'>
          <h2 className='mb-2.5 font-semibold'>Your lists</h2>
          <Empty className='min-w-full w-0 h-[50vh] max-h-96'>
            <p>
              To view tweets from your own lists,{' '}
              <Link className='underline' to='/oauth'>
                login with Twitter
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
