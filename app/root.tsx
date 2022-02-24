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
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@400;600;700&display=swap' },
    { rel: 'preconnect', href: 'https://api.fontshare.com' },
    { rel: 'preconnect', href: 'https://cdn.fontshare.com', crossOrigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://api.fontshare.com/css?f[]=synonym@1&display=swap' },
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
