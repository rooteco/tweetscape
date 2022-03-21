import { Link, NavLink, useFetcher, useMatches, useTransition } from 'remix';
import cn from 'classnames';

import { Theme, useTheme } from '~/theme';
import Empty from '~/components/empty';
import type { LoaderData } from '~/root';
import Sync from '~/components/sync';

export default function Header() {
  const [theme, setTheme] = useTheme();
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = root?.clusters ?? [];
  const lists = root?.lists ?? [];
  const fetcher = useFetcher();
  const transition = useTransition();
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
            <svg
              className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
              xmlns='http://www.w3.org/2000/svg'
              height='24'
              viewBox='0 0 24 24'
              width='24'
            >
              <path d='M0 0h24v24H0z' fill='none' />
              <path d='M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z' />
            </svg>
            <span>Logout</span>
          </button>
        )}
        {!root?.user && (
          <Link
            className='inline-flex truncate items-center text-white text-xs bg-sky-500 rounded px-2 h-6'
            to='/oauth'
          >
            <svg
              className='shrink-0 w-3.5 h-3.5 mr-1 fill-white'
              viewBox='328 355 335 276'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='
            M 630, 425
            A 195, 195 0 0 1 331, 600
            A 142, 142 0 0 0 428, 570
            A  70,  70 0 0 1 370, 523
            A  70,  70 0 0 0 401, 521
            A  70,  70 0 0 1 344, 455
            A  70,  70 0 0 0 372, 460
            A  70,  70 0 0 1 354, 370
            A 195, 195 0 0 0 495, 442
            A  67,  67 0 0 1 611, 380
            A 117, 117 0 0 0 654, 363
            A  65,  65 0 0 1 623, 401
            A 117, 117 0 0 0 662, 390
            A  65,  65 0 0 1 630, 425
            Z'
              />
            </svg>
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
          <svg
            className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
            xmlns='http://www.w3.org/2000/svg'
            height='24'
            viewBox='0 0 24 24'
            width='24'
          >
            <path d='M0 0h24v24H0z' fill='none' />
            <path d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
          </svg>
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
            <svg
              className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
              xmlns='http://www.w3.org/2000/svg'
              enableBackground='new 0 0 24 24'
              height='24'
              viewBox='0 0 24 24'
              width='24'
            >
              <rect fill='none' height='24' width='24' />
              <path d='M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26 c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z' />
            </svg>
          )}
          {theme === Theme.Light && (
            <svg
              className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
              xmlns='http://www.w3.org/2000/svg'
              enableBackground='new 0 0 24 24'
              height='24'
              viewBox='0 0 24 24'
              width='24'
            >
              <rect fill='none' height='24' width='24' />
              <path d='M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2 c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1 C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06 c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41 l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41 c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36 c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z' />
            </svg>
          )}
          {(theme === undefined || theme === Theme.System) && (
            <svg
              className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
              xmlns='http://www.w3.org/2000/svg'
              enableBackground='new 0 0 24 24'
              height='24'
              viewBox='0 0 24 24'
              width='24'
            >
              <g>
                <rect fill='none' height='24' width='24' x='0' />
              </g>
              <g>
                <g>
                  <g>
                    <path d='M20,18c1.1,0,2-0.9,2-2V6c0-1.1-0.9-2-2-2H4C2.9,4,2,4.9,2,6v10c0,1.1,0.9,2,2,2H0v2h24v-2H20z M4,6h16v10H4V6z' />
                  </g>
                </g>
              </g>
            </svg>
          )}
          <span>{Object.values(Theme)[theme ?? Theme.System]}</span>
        </button>
      </div>
      {!!clusters.length && (
        <section className='text-sm mt-5'>
          <h2 className='mb-2.5 font-semibold'>Hive clusters</h2>
          <div className='border-l border-slate-200 dark:border-slate-800'>
            {clusters.map(({ id, name, slug }) => (
              <NavLink
                key={id}
                className={({ isActive }) =>
                  cn(
                    'block pl-3 py-0.5 my-1 -ml-px border-l border-transparent',
                    {
                      'border-current font-semibold dark:text-sky-400 text-sky-500':
                        isActive,
                      'text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition hover:text-slate-800 dark:hover:text-slate-200':
                        !isActive,
                      'cursor-wait': transition.state !== 'idle',
                    }
                  )
                }
                to={`/clusters/${slug}`}
              >
                {name}
              </NavLink>
            ))}
          </div>
        </section>
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
        <section className='text-sm mt-5'>
          <h2 className='mb-2.5 font-semibold'>Your lists</h2>
          <div className='border-l border-slate-200 dark:border-slate-800'>
            {lists.map(({ id, name }) => (
              <NavLink
                key={id}
                className={({ isActive }) =>
                  cn(
                    'block pl-3 py-0.5 my-1 -ml-px border-l border-transparent',
                    {
                      'border-current font-semibold dark:text-sky-400 text-sky-500':
                        isActive,
                      'text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition hover:text-slate-800 dark:hover:text-slate-200':
                        !isActive,
                      'cursor-wait': transition.state !== 'idle',
                    }
                  )
                }
                to={`/lists/${id}`}
              >
                {name}
              </NavLink>
            ))}
          </div>
        </section>
      )}
    </nav>
  );
}
