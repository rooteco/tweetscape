import type { Dispatch, SetStateAction } from 'react';
import {
  Link,
  NavLink,
  useFetcher,
  useLocation,
  useMatches,
  useResolvedPath,
  useTransition,
} from '@remix-run/react';
import { animated, config, useSpring } from '@react-spring/web';
import { useRef, useState } from 'react';
import cn from 'classnames';

import BirdIcon from '~/icons/bird';
import FireIcon from '~/icons/fire';
import type { LoaderData } from '~/root';
import LogoutIcon from '~/icons/logout';
import OpenInNewIcon from '~/icons/open-in-new';
import Switcher from '~/components/switcher';
import ThemeSwitcher from '~/components/theme-switcher';
import useSync from '~/hooks/sync';

function PageSwitcher() {
  const { pathname } = useLocation();
  const matches = useMatches();
  const root = matches[0].data as LoaderData | undefined;
  const type = pathname.split('/')[3] ?? 'articles';
  const clusters = (root?.clusters ?? []).map((c) => ({
    name: c.name,
    to: `/clusters/${c.slug}/${type}`,
  }));
  const lists = (root?.lists ?? []).map((l) => ({
    name: l.name,
    to: `/lists/${l.id}/${type}`,
  }));
  const rekt = [{ name: 'Crypto', to: `/rekt/crypto/${type}` }];
  return (
    <Switcher
      sections={[
        { header: 'Hive clusters', links: clusters },
        { header: 'Rekt parlors', links: rekt },
        { header: 'Your lists', links: lists },
      ]}
    />
  );
}

type TabProps = {
  to: string;
  children: string;
  setActive: Dispatch<SetStateAction<{ x: number; width: number } | undefined>>;
};
function Tab({ to, children, setActive }: TabProps) {
  const transition = useTransition();
  const path = useResolvedPath(to);
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <NavLink
      to={to}
      ref={ref}
      prefetch='intent'
      onMouseOver={() =>
        setActive((prev) =>
          ref.current
            ? { x: ref.current.offsetLeft, width: ref.current.offsetWidth }
            : prev
        )
      }
      onMouseOut={() => setActive(undefined)}
      className={({ isActive }) =>
        cn('mr-1.5 flex items-center text-xs rounded px-2 h-6', {
          'bg-gray-200 dark:bg-gray-700': isActive,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname,
        })
      }
    >
      {children}
    </NavLink>
  );
}

function Tabs() {
  const [active, setActive] = useState<{ x: number; width: number }>();
  const styles = useSpring({
    x: active?.x,
    width: active?.width,
    opacity: active ? 1 : 0,
    config: config.stiff,
  });
  return (
    <nav className='flex items-stretch relative'>
      <animated.div
        style={styles}
        className='absolute h-6 rounded bg-gray-100 dark:bg-gray-800 -z-[1]'
      />
      <Tab to='tweets' setActive={setActive}>
        Tweets
      </Tab>
      <Tab to='articles' setActive={setActive}>
        Articles
      </Tab>
    </nav>
  );
}

export default function Header() {
  const root = useMatches()[0].data as LoaderData | undefined;
  const fetcher = useFetcher();
  const { indicator } = useSync('/sync/lists', 'lists', !!root?.user);
  return (
    <header className='flex-none border-b border-gray-200 dark:border-gray-800'>
      <nav className='flex items-stretch justify-center p-1.5 mx-auto'>
        <PageSwitcher />
        <div className='mr-1.5 border-l border-gray-200 dark:border-gray-800' />
        <Tabs />
        <div className='mr-1.5 border-l border-gray-200 dark:border-gray-800' />
        {root?.user && (
          <button
            type='button'
            className='mr-1.5 disabled:cursor-wait flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
            onClick={() =>
              fetcher.submit(null, { method: 'patch', action: '/logout' })
            }
            disabled={fetcher.state !== 'idle'}
          >
            <LogoutIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
            <span>Logout</span>
          </button>
        )}
        {!root?.user && (
          <Link
            className='mr-1.5 flex truncate items-center text-white text-xs bg-sky-500 rounded px-2 h-6'
            to='/oauth'
          >
            <BirdIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-white' />
            <span>Login with Twitter</span>
          </Link>
        )}
        {root?.user && indicator}
        <Link
          prefetch='intent'
          className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          to='/changelog'
        >
          <FireIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          <span>Changelog</span>
        </Link>
        <ThemeSwitcher />
        <a
          className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          href='https://github.com/rooteco/tweetscape'
          target='_blank'
          rel='noopener noreferrer'
        >
          <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          <span>GitHub</span>
        </a>
        <a
          className='flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
          href='https://discord.gg/3KYQBJwRSS'
          target='_blank'
          rel='noopener noreferrer'
        >
          <OpenInNewIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          <span>Community</span>
        </a>
      </nav>
    </header>
  );
}
