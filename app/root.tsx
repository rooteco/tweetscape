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
import { useEffect, useState } from 'react';
import NProgress from 'nprogress';
import cn from 'classnames';

import type { Cluster } from '~/db.server';
import { log } from '~/utils.server';
import { pool } from '~/db.server';
import styles from '~/styles/app.css';

type Theme = 'sync' | 'dark' | 'light';
const THEMES = ['sync', 'dark', 'light'];
const THEME_SNIPPET = `
  if (localStorage.theme === 'dark')
    document.documentElement.classList.add('dark');
  if (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    document.documentElement.classList.add('dark');
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
  {
    rel: 'preload',
    href: '/fonts/literata-latin.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/literata-latin-ext.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  { rel: 'stylesheet', href: '/fonts/inter.css' },
  { rel: 'stylesheet', href: '/fonts/literata.css' },
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

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-amber-100 w-full px-4 lg:px-0 max-w-screen-lg mx-auto my-4 dark:bg-slate-900 text-slate-900 dark:text-white'>
        <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
        <header className='py-4 mb-8 border-b-2 border-slate-900 dark:border-white whitespace-no-wrap flex justify-between items-end'>
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
              onClick={() =>
                setTheme(
                  (prev) => THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length]
                )
              }
            >
              {THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]}
            </button>
          </nav>
        </header>
        <Outlet />
        <footer className='py-4 mt-10 border-t-2 border-slate-900 dark:border-white whitespace-no-wrap flex justify-end items-end'>
          <p className='text-sm text-center md:text-right'>
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
              href='https://github.com/nicholaschiang/tweetscape'
              target='_blank'
              rel='noopener noreferrer'
            >
              github
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
