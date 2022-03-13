import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
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
import NProgress from 'nprogress';
import cn from 'classnames';

import type { Cluster } from '~/db.server';
import Empty from '~/components/empty';
import { Client } from '~/db.server';
import Footer from '~/components/footer';
import Header from '~/components/header';
import OpenIcon from '~/icons/open';
import { log } from '~/utils.server';
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
export function useTheme(): [
  Theme | undefined,
  Dispatch<SetStateAction<Theme | undefined>>
] {
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
  return useMemo(() => [theme, setTheme], [theme, setTheme]);
}

export function ErrorBoundary({ error }: { error: Error }) {
  useTheme();
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
        <Header />
        <Empty>
          <p>an unexpected runtime error ocurred</p>
          <p>{error.message}</p>
        </Empty>
        <Footer />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export const loader: LoaderFunction = async () => {
  log.info(`Establishing connection with PostgreSQL...`);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.on('error', (e) => log.error(`PostgreSQL root error: ${e.stack}`));
  await client.connect();
  log.info('Fetching visible clusters...');
  const data = await client.query(
    'select * from clusters where visible = true'
  );
  log.info(`Disconnecting client from PostgreSQL...`);
  await client.end();
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

  const [theme, setTheme] = useTheme();
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
        <Header>
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
              <OpenIcon />
            </a>
          </nav>
        </Header>
        <Outlet />
        <Footer />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
