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
} from 'remix';
import type { LinksFunction, LoaderFunction, MetaFunction } from 'remix';
import cn from 'classnames';

import { log } from '~/utils.server';
import styles from '~/styles/app.css';

export const links: LinksFunction = () => [
  {
    rel: 'preload',
    href: '/fonts/sans.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/serif-latin-400.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: '/fonts/serif-latin-600.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  { rel: 'stylesheet', href: '/fonts/serif.css' },
  { rel: 'stylesheet', href: '/fonts/sans.css' },
  { rel: 'stylesheet', href: styles },
];

export const meta: MetaFunction = () => ({
  title: 'Tweetscape: The Supercharged Twitter Feed',
});

interface Cluster {
  active: boolean;
  created_at: string;
  id: string;
  name: string;
  updated_at: string;
}

interface Topic {
  id: string;
  name: string;
}

export const loader: LoaderFunction = async () => {
  log.info('Fetching clusters...');
  const hive = await fetch('https://api.borg.id/influence/clusters', {
    headers: { authorization: `Token ${process.env.HIVE_TOKEN}` },
    cf: { cacheTtl: 24 * 60 * 60, cacheEverything: true },
  });
  const { clusters } = (await hive.json()) as { clusters: Cluster[] };
  const topics: Topic[] = clusters.map((c) => ({
    id: c.name.toLowerCase().split(' ').join('-'),
    name: c.name,
  }));
  log.debug(`Topics: ${topics.map((t) => `${t.name} (${t.id})`).join(', ')}`);
  return topics;
};

export default function App() {
  const topics = useLoaderData<Topic[]>();
  const { pathname } = useLocation();
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='selection:bg-amber-100 w-full px-4 xl:px-0 max-w-screen-xl mx-auto my-4'>
        <header className='py-4 mb-6 border-b-2 border-black whitespace-no-wrap flex justify-between items-end'>
          <h1 className='font-serif font-semibold text-6xl'>tweetscape</h1>
          <nav className='font-serif font-semibold text-lg'>
            {topics
              .map(({ name, id }) => (
                <Link
                  key={id}
                  className={cn('lowercase', {
                    underline: pathname === `/${id}`,
                  })}
                  to={`/${id}`}
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
          </nav>
        </header>
        <Outlet />
        <footer className='py-4 mt-10 border-t-2 border-black whitespace-no-wrap flex justify-end items-end'>
          <p className='font-serif text-sm text-center md:text-right'>
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
