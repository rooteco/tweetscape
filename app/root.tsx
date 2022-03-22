import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useTransition,
} from 'remix';
import type { LinksFunction, LoaderFunction, MetaFunction } from 'remix';
import { useEffect, useMemo, useState } from 'react';
import NProgress from 'nprogress';

import type { Cluster, Influencer, List } from '~/types';
import { Prisma, db } from '~/db.server';
import { commitSession, getSession } from '~/session.server';
import Empty from '~/components/empty';
import { ErrorContext } from '~/error';
import Footer from '~/components/footer';
import Header from '~/components/header';
import { THEME_SNIPPET } from '~/theme';
import { getLists } from '~/query.server';
import { log } from '~/utils.server';
import styles from '~/styles/app.css';
import { swr } from '~/swr.server';

export function ErrorBoundary({ error: e }: { error: Error }) {
  const [error, setError] = useState<Error | undefined>(e);
  const context = useMemo(() => ({ error, setError }), [error, setError]);
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-slate-200 selection:text-black dark:selection:bg-slate-700 dark:selection:text-slate-100 w-full h-full dark:bg-slate-900 text-slate-900 dark:text-slate-100 fixed overflow-hidden'>
        <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
        <ErrorContext.Provider value={context}>
          <div className='w-full h-full min-h-full overflow-hidden flex items-stretch'>
            <Header />
            <Empty className='m-10 flex-1'>
              <article className='max-w-md'>
                <p className='uppercase'>
                  an unexpected runtime error occurred
                </p>
                <p>{e.message}</p>
              </article>
            </Empty>
          </div>
          <Footer />
        </ErrorContext.Provider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export type LoaderData = {
  clusters: Cluster[];
  lists: List[];
  user?: Influencer;
};

export const loader: LoaderFunction = async ({ request }) => {
  log.info('Fetching visible clusters...');
  const clusters = await swr<Cluster>(
    Prisma.sql`select * from clusters where visible = true`
  );
  log.info(`Fetched ${clusters.length} visible clusters.`);
  const session = await getSession(request.headers.get('Cookie'));
  const uid = session.get('uid') as string | undefined;
  let user: Influencer | undefined;
  let lists: List[] = [];
  if (uid) {
    log.info(`Fetching user (${uid})...`);
    const influencer = await db.influencers.findUnique({ where: { id: uid } });
    if (influencer) user = influencer;
    else log.warn(`User (${uid}) could not be found.`);
    log.info(`Fetching lists for user ${user?.name} (${user?.id ?? uid})...`);
    lists = await getLists(uid);
  }
  const headers = { 'Set-Cookie': await commitSession(session) };
  return json<LoaderData>({ clusters, user, lists }, { headers });
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
    const timeoutId = setTimeout(() => NProgress.start(), 250);
    return () => clearTimeout(timeoutId);
  }, [transition.state]);
  const [error, setError] = useState<Error>();
  const context = useMemo(() => ({ error, setError }), [error, setError]);
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-slate-200 selection:text-black dark:selection:bg-slate-700 dark:selection:text-slate-100 w-full h-full dark:bg-slate-900 text-slate-900 dark:text-slate-100 fixed overflow-hidden'>
        <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
        <ErrorContext.Provider value={context}>
          <div className='w-full h-full min-h-full overflow-hidden flex items-stretch'>
            <Header />
            <Outlet />
          </div>
        </ErrorContext.Provider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
