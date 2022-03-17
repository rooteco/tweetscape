import { useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import { nanoid } from 'nanoid';
import { useLoaderData } from 'remix';

import type { LoaderData } from '~/root';
import TwitterIcon from '~/icons/twitter';

// Base64-URL-encoding is a minor variation on the typical Base64 encoding
// method. It starts with the same Base64-encoding method available in most
// programming languages, but uses URL-safe characters instead.
// @see {@link https://www.oauth.com/oauth2-servers/pkce/authorization-request}
function base64UrlEncode(str: string) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function OAuth() {
  const { env } = useLoaderData<LoaderData>();
  const state = useMemo(() => nanoid(), []);
  useEffect(() => localStorage.setItem('state', state), [state]);
  const href = useMemo(() => {
    const params = {
      state,
      response_type: 'code',
      client_id: env.OAUTH_CLIENT_ID,
      redirect_uri: encodeURIComponent(env.OAUTH_REDIRECT_URI),
      scope: [
        'tweet.read',
        'tweet.write',
        'users.read',
        'follows.read',
        'follows.write',
        'offline.access',
        'like.read',
        'like.write',
        'list.read',
        'list.write',
      ].join('%20'),
      code_challenge: base64UrlEncode(nanoid()),
      code_challenge_method: 'S256',
    };
    const search = Object.entries(params)
      .map((p) => p.join('='))
      .join('&');
    const url = new URL(`https://twitter.com/i/oauth2/authorize?${search}`);
    return url.href;
  }, [state, env.OAUTH_CLIENT_ID, env.OAUTH_REDIRECT_URI]);

  const [visible, setVisible] = useState<boolean>(true);
  const lastScrollPosition = useRef<number>(0);

  useEffect(() => {
    function handleScroll(): void {
      const currentScrollPosition = window.pageYOffset;
      const prevScrollPosition = lastScrollPosition.current;
      lastScrollPosition.current = currentScrollPosition;
      setVisible(() => {
        const scrolledUp = currentScrollPosition < prevScrollPosition;
        const scrolledToTop = currentScrollPosition < 10;
        return scrolledUp || scrolledToTop;
      });
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <aside
      className={cn(
        'fixed transition-all right-5 max-w-xs p-5 border border-slate-200 shadow-xl dark:border-white z-20 bg-white dark:bg-slate-900 rounded text-sm',
        { 'top-5 opacity-100': visible, '-top-5 opacity-0 invisible': !visible }
      )}
    >
      <p>
        These are articles pulled from Twitter using{' '}
        <a
          className='underline'
          href='https://borgcollective.notion.site/About-15b9db2c1f414cf998c5abc58b715176'
          target='_blank'
          rel='noopener noreferrer'
        >
          the Borg Collective
        </a>
        ’s proprietary{' '}
        <a
          className='underline'
          href='https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18'
          target='_blank'
          rel='noopener noreferrer'
        >
          algorithm for trust
        </a>
        .
      </p>
      <p className='mt-2.5'>To view your own feed and lists, login:</p>
      <a
        className='mt-3.5 block rounded h-12 flex justify-center items-center bg-[#1d9bf0] font-medium text-white text-base px-3'
        href={href}
      >
        <TwitterIcon className='w-5 h-5 mr-2' />
        <span className='truncate inline-block leading-6'>
          Continue with Twitter
        </span>
      </a>
    </aside>
  );
}
