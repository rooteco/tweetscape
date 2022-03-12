import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useTransition,
} from 'remix';
import type { LinksFunction, LoaderFunction, MetaFunction } from 'remix';
import { useEffect, useMemo, useState } from 'react';
import NProgress from 'nprogress';
import cn from 'classnames';

import type { Cluster } from '~/db.server';
import { log } from '~/utils.server';
import { pool } from '~/db.server';
import styles from '~/styles/app.css';

type Theme = 'sync' | 'dark' | 'light';
const THEMES: Theme[] = ['sync', 'dark', 'light'];
const THEME_SNIPPET = `
  if (localStorage.theme === 'dark')
    document.documentElement.classList.add('dark');
  if (!localStorage.theme || localStorage.theme === 'sync') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) 
      document.documentElement.classList.add('dark');
  }
  `;

export const loader: LoaderFunction = async () => {
  log.info('Fetching visible clusters...');
  const data = await pool.query('select * from clusters where visible = true');
  log.trace(`Clusters: ${JSON.stringify(data.rows, null, 2)}`);
  log.info(`Fetched ${data.rows.length} visible clusters.`);
  return data.rows as Cluster[];
};

export const links: LinksFunction = () => [
  {
    rel: 'preload',
    href: '/fonts/inter-latin.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/inter-latin-ext.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  { rel: 'stylesheet', href: '/fonts/inter.css' },
  { rel: 'stylesheet', href: styles },
];

export const meta: MetaFunction = () => ({
  title: 'Tweetscape: The Supercharged Twitter Feed',
});

export default function App() {
  const transition = useTransition();
  useEffect(() => {
    // when the state is idle then we can to complete the progress bar
    if (transition.state === 'idle') NProgress.done();
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    else NProgress.start();
  }, [transition.state]);

  const clusters = useLoaderData<Cluster[]>();
  const { pathname } = useLocation();

  const [theme, setTheme] = useState<Theme>();
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'sync') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
    }
  }, [theme]);
  useEffect(() => {
    setTheme((prev) => (localStorage.getItem('theme') as Theme) ?? prev);
  }, []);
  useEffect(() => {
    if (theme) localStorage.setItem('theme', theme);
  }, [theme]);
  const nextTheme = useMemo(
    () => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length],
    [theme]
  );

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-slate-200 dark:selection:bg-slate-700 w-full px-4 lg:px-0 max-w-screen-lg mx-auto my-4 dark:bg-slate-900 text-slate-900 dark:text-white'>
        <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
        <header className='py-4 border-b-2 border-slate-900 dark:border-white whitespace-no-wrap flex justify-between items-end'>
          <h1 className='font-extrabold tracking-tighter text-4xl'>
            tweetscape.co
          </h1>
          <nav className='font-semibold text-sm'>
            {clusters
              .map(({ id, name, slug }) => (
                <Link
                  key={id}
                  className={cn('lowercase', {
                    underline: pathname === `/${slug}`,
                  })}
                  to={`/${slug}`}
                >
                  {name}
                </Link>
              ))
              .reduce((a, b) => (
                <>
                  {a}
                  {' · '}
                  {b}
                </>
              ))}
            {' · '}
            <button
              type='button'
              className='font-semibold text-sm w-[32.25px]'
              aria-pressed={theme === 'sync' ? 'mixed' : theme === 'dark'}
              onClick={() => setTheme(nextTheme)}
            >
              {nextTheme}
            </button>
            {' · '}
            <a
              href='https://github.com/nicholaschiang/tweetscape'
              target='_blank'
              rel='noopener noreferrer'
            >
              github
              <svg
                className='fill-current h-4 w-4 inline-block ml-1'
                xmlns='http://www.w3.org/2000/svg'
                height='24'
                viewBox='0 0 24 24'
                width='24'
              >
                <path d='M0 0h24v24H0z' fill='none' />
                <path d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
              </svg>
            </a>
          </nav>
        </header>
        <Outlet />
        <footer className='py-4 mt-10 border-t-2 border-slate-900 dark:border-white whitespace-no-wrap flex justify-end items-end'>
          <p className='text-xs text-center md:text-right'>
            all content copyright{' '}
            <a
              className='underline'
              href='https://roote.co'
              target='_blank'
              rel='noopener noreferrer'
            >
              roote
            </a>{' '}
            © 2022 · all rights reserved
            <br />
            read more about{' '}
            <a
              className='underline'
              href='https://www.roote.co/tweetscape/vision'
              target='_blank'
              rel='noopener noreferrer'
            >
              our vision
            </a>{' '}
            and{' '}
            <a
              className='underline'
              href='https://github.com/nicholaschiang/tweetscape#how-it-works'
              target='_blank'
              rel='noopener noreferrer'
            >
              how it works
            </a>{' '}
            ·{' '}
            <a
              className='underline'
              href='https://twitter.com/TweetscapeHQ'
              target='_blank'
              rel='noopener noreferrer'
            >
              twitter
            </a>
          </p>
        </footer>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
