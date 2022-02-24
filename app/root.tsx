import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from 'remix';
import type { LinksFunction, MetaFunction } from 'remix';

import styles from '~/styles/app.css';

export const links: LinksFunction = () => {
  return [
    { rel: 'preload', href: '/fonts/sans.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    { rel: 'preload', href: '/fonts/serif-latin-600.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    { rel: 'stylesheet', href: '/fonts/serif.css' },
    { rel: 'stylesheet', href: '/fonts/sans.css' },
    { rel: 'stylesheet', href: styles },
  ];
};

export const meta: MetaFunction = () => {
  return { title: 'Tweetscape: The Supercharged Twitter Feed' };
};

export default function App() {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='w-full px-4 xl:px-0 max-w-screen-lg mx-auto my-4'>
        <header className='py-4 border-b-2 border-black whitespace-no-wrap'>
          <h1 className='font-serif font-semibold text-6xl'>Tweetscape</h1>
        </header>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
