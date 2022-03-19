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
import { useEffect } from 'react';

import type { Cluster, Influencer, List } from '~/types';
import { commitSession, getSession } from '~/session.server';
import Empty from '~/components/empty';
import Footer from '~/components/footer';
import Header from '~/components/header';
import { THEME_SNIPPET } from '~/theme';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { redis } from '~/redis.server';
import styles from '~/styles/app.css';

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-slate-200 selection:text-black dark:selection:bg-slate-700 dark:selection:text-white w-full px-4 lg:px-0 max-w-screen-lg mx-auto my-4 dark:bg-slate-900 text-slate-900 dark:text-white'>
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

export type LoaderData = {
  clusters: Cluster[];
  lists: List[];
  user?: Influencer;
};

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
  let lists: List[] = [];
  if (uid) {
    log.info(`Fetching user (${uid})...`);
    const influencer = await db.influencers.findUnique({ where: { id: uid } });
    if (influencer) user = influencer;
    else log.warn(`User (${uid}) could not be found.`);
    log.info(`Fetching lists for user ${user?.name} (${user?.id ?? uid})...`);
    // TODO: Wrap the `uid` in some SQL injection avoidance mechanism as it's
    // very much possible that somebody smart and devious could:
    // a) find our cookie secret and encrypt their own (fake) session cookie;
    // b) set the session cookie `uid` to some malicious raw SQL;
    // c) have that SQL run here and mess up our production db.
    lists = await redis<List>(
      `
      select lists.* from lists
      left outer join list_followers on list_followers.list_id = lists.id
      where lists.owner_id = '${uid}' or list_followers.influencer_id = '${uid}'
      `
    );
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
    const timeoutId = setTimeout(() => NProgress.start(), 500);
    return () => clearTimeout(timeoutId);
  }, [transition.state]);

  const { clusters, lists } = useLoaderData<LoaderData>();

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-slate-200 selection:text-black dark:selection:bg-slate-700 dark:selection:text-white w-full px-4 lg:px-0 max-w-screen-lg mx-auto my-4 dark:bg-slate-900 text-slate-900 dark:text-white'>
        <script dangerouslySetInnerHTML={{ __html: THEME_SNIPPET }} />
        <Header>
          <div className='flex mb-4'>
            {!!lists.length && (
              <div>
                <h2 className='uppercase text-xs text-slate-400 dark:text-slate-600'>
                  Lists
                </h2>
                <nav className='font-semibold text-sm'>
                  {lists
                    .map(({ id, name }) => (
                      <NavLink
                        key={id}
                        className={({ isActive }) =>
                          cn('lowercase', { underline: isActive })
                        }
                        to={`/lists/${id}`}
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
                </nav>
              </div>
            )}
            {!!clusters.length && (
              <div className='ml-4'>
                <h2 className='uppercase text-xs text-slate-400 dark:text-slate-600'>
                  Clusters
                </h2>
                <nav className='font-semibold text-sm'>
                  {clusters
                    .map(({ id, name, slug }) => (
                      <NavLink
                        key={id}
                        className={({ isActive }) =>
                          cn('lowercase', { underline: isActive })
                        }
                        to={`/clusters/${slug}`}
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
                </nav>
              </div>
            )}
          </div>
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
