import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
  useTransition,
} from 'remix';
import type { LinksFunction, LoaderFunction, MetaFunction } from 'remix';
import NProgress from 'nprogress';
import cn from 'classnames';

import type { Cluster, Influencer } from '~/types';
import { commitSession, getSession } from '~/session.server';
import Empty from '~/components/empty';
import Footer from '~/components/footer';
import Header from '~/components/header';
import OpenIcon from '~/icons/open';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { redis } from '~/redis.server';
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
          <p>an unexpected runtime error occurred</p>
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

export type LoaderData = { clusters: Cluster[]; user?: Influencer };

export const loader: LoaderFunction = async ({ request }) => {
  log.info('Fetching visible clusters...');
  const clusters = await redis<Cluster>(
    'select * from clusters where visible = true'
  );
  log.trace(`Clusters: ${JSON.stringify(clusters, null, 2)}`);
  log.info(`Fetched ${clusters.length} visible clusters.`);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  let user: Influencer | undefined;
  if (uid) {
    log.info(`Fetching user (${uid})...`);
    const influencer = await db.influencers.findUnique({ where: { id: uid } });
    if (influencer) user = influencer;
    else log.warn(`User (${uid}) could not be found.`);
  }
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>({ clusters, user }, { headers });
};

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
  },
  { rel: 'stylesheet', href: styles },
  { rel: 'mask-icon', sizes: 'any', href: '/favicon.svg', color: '#1D9BF0' },
  { rel: 'shortcut icon', href: '/favicon.ico' },
  { rel: 'apple-touch-icon', sizes: '192x192', href: '/favicon.png' },
];

export const meta: MetaFunction = () => ({ title: 'Tweetscape' });

export default function App() {
  const transition = useTransition();
  useEffect(() => {
    if (transition.state === 'idle') {
      // when the state is idle then we can to complete the progress bar
      NProgress.done();
      return () => {};
    }
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    const timeoutId = setTimeout(() => NProgress.start(), 500);
    return () => clearTimeout(timeoutId);
  }, [transition.state]);

  const { clusters } = useLoaderData<LoaderData>();

  const [theme, setTheme] = useTheme();
  const nextTheme = useMemo(
    () => THEMES[(THEMES.indexOf(theme as Theme) + 1) % THEMES.length],
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
                <NavLink
                  key={id}
                  className={({ isActive }) =>
                    cn('lowercase', { underline: isActive })
                  }
                  to={`/${slug}`}
                >
                  {name}
                </NavLink>
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
              href='https://github.com/rooteco/tweetscape'
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
