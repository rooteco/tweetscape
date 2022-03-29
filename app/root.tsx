import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from 'remix';
import type { LinksFunction, LoaderFunction, MetaFunction } from 'remix';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Cluster, Influencer, List } from '~/types';
import {
  Theme,
  ThemeBody,
  ThemeHead,
  ThemeProvider,
  isTheme,
  useTheme,
} from '~/theme';
import { commitSession, getSession } from '~/session.server';
import { log, nanoid } from '~/utils.server';
import Empty from '~/components/empty';
import { ErrorContext } from '~/error';
import Footer from '~/components/footer';
import { Prisma } from '~/db.server';
import { getLists } from '~/query.server';
import styles from '~/styles/app.css';
import { swr } from '~/swr.server';

export type LoaderData = {
  clusters: Cluster[];
  lists: List[];
  user?: Influencer;
  theme: Theme | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const invocationId = nanoid(5);
  console.time(`root-loader-${invocationId}`);
  console.time(`get-session-${invocationId}`);
  const session = await getSession(request.headers.get('Cookie'));
  console.timeEnd(`get-session-${invocationId}`);
  const uid = session.get('uid') as string | undefined;
  let user: Influencer | undefined;
  let lists: List[] = [];
  let clusters: Cluster[] = [];
  await Promise.all([
    (async () => {
      log.info('Fetching visible clusters...');
      console.time(`swr-get-clusters-${invocationId}`);
      clusters = await swr<Cluster>(
        Prisma.sql`select * from clusters where visible = true`
      );
      console.timeEnd(`swr-get-clusters-${invocationId}`);
      log.info(`Fetched ${clusters.length} visible clusters.`);
    })(),
    (async () => {
      if (!uid) return;
      log.info(`Fetching user (${uid})...`);
      console.time(`swr-get-user-${invocationId}`);
      const users = await swr<Influencer>(
        Prisma.sql`select * from influencers where id = ${uid}`
      );
      console.timeEnd(`swr-get-user-${invocationId}`);
      if (users.length > 1) log.error(`Too many users (${uid}) found.`);
      else if (users.length === 1) [user] = users;
      else log.warn(`User (${uid}) could not be found.`);
    })(),
    (async () => {
      if (!uid) return;
      log.info(`Fetching lists for user (${uid})...`);
      console.time(`swr-get-lists-${invocationId}`);
      lists = await getLists(uid);
      console.timeEnd(`swr-get-lists-${invocationId}`);
    })(),
  ]);
  const themeValue = session.get('theme') as Theme | null;
  const theme = isTheme(themeValue) ? themeValue : null;
  log.info(`Found theme cookie (${theme}).`);
  const headers = { 'Set-Cookie': await commitSession(session) };
  console.timeEnd(`root-loader-${invocationId}`);
  return json<LoaderData>({ theme, clusters, user, lists }, { headers });
};

export const links: LinksFunction = () => [
  {
    rel: 'preload',
    href: '/fonts/inter-400.woff2',
    crossOrigin: 'anonymous',
    type: 'font/woff2',
    as: 'font',
  },
  {
    rel: 'preload',
    href: '/fonts/inter-600.woff2',
    crossOrigin: 'anonymous',
    type: 'font/woff2',
    as: 'font',
  },
  {
    rel: 'preload',
    href: '/fonts/inter-700.woff2',
    crossOrigin: 'anonymous',
    type: 'font/woff2',
    as: 'font',
  },
  { rel: 'stylesheet', href: '/fonts/inter.css' },
  { rel: 'stylesheet', href: styles },
  { rel: 'mask-icon', sizes: 'any', href: '/favicon.svg', color: '#1D9BF0' },
  { rel: 'shortcut icon', href: '/favicon.ico' },
  { rel: 'apple-touch-icon', sizes: '192x192', href: '/favicon.png' },
];

export const meta: MetaFunction = () => ({
  title: 'Tweetscape',
  charset: 'utf-8',
  viewport: 'width=device-width,initial-scale=1',
});

function App({ children }: { children: ReactNode }) {
  const data = useLoaderData<LoaderData>();
  const [theme] = useTheme();
  return (
    <html lang='en' className={theme ?? ''}>
      <head>
        <Meta />
        <Links />
        <ThemeHead ssrTheme={Boolean(data.theme)} />
      </head>
      <body className='selection:bg-gray-200 selection:text-black dark:selection:bg-gray-700 dark:selection:text-gray-100 w-full h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'>
        <div className='fixed inset-0 overflow-auto'>{children}</div>
        <ThemeBody ssrTheme={Boolean(data.theme)} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error: e }: { error: Error }) {
  const [error, setError] = useState<Error | undefined>(e);
  const context = useMemo(() => ({ error, setError }), [error, setError]);
  return (
    <ThemeProvider specifiedTheme={null}>
      <ErrorContext.Provider value={context}>
        <App>
          <div className='w-full h-full min-h-full overflow-hidden flex items-stretch'>
            <Empty className='m-10 flex-1'>
              <article className='max-w-md'>
                <p>An unexpected runtime error occurred:</p>
                <p>{e.message}</p>
                <p className='mt-2'>
                  Try logging out and in again. Or smash your keyboard; that
                  sometimes helps. If you still have trouble, come and complain
                  in{' '}
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
              </article>
            </Empty>
          </div>
          <Footer />
        </App>
      </ErrorContext.Provider>
    </ThemeProvider>
  );
}

export default function AppWithProviders() {
  const [error, setError] = useState<Error>();
  const context = useMemo(() => ({ error, setError }), [error, setError]);
  const data = useLoaderData<LoaderData>();
  return (
    <ThemeProvider specifiedTheme={data.theme}>
      <ErrorContext.Provider value={context}>
        <App>
          <Outlet />
        </App>
      </ErrorContext.Provider>
    </ThemeProvider>
  );
}
