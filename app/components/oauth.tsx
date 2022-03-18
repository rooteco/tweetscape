import { Link, useFetcher, useMatches } from 'remix';
import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';

import type { LoaderData } from '~/root';
import TwitterIcon from '~/icons/twitter';

export default function OAuth() {
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

  const { user } = useMatches()[0].data as LoaderData;

  const fetcher = useFetcher();
  useEffect(() => {
    if (user && fetcher.type === 'init') fetcher.load('/sync');
  }, [user, fetcher]);

  return (
    <aside
      className={cn(
        'fixed transition-all right-5 max-w-xs p-5 border border-slate-200 shadow-xl dark:border-white z-20 bg-white dark:bg-slate-900 rounded text-sm',
        { 'top-5 opacity-100': visible, '-top-5 opacity-0 invisible': !visible }
      )}
    >
      {!user && (
        <>
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
          <Link
            className='mt-3.5 block rounded h-12 flex justify-center items-center bg-[#1d9bf0] font-medium text-white text-base px-3'
            to='/oauth'
          >
            <TwitterIcon className='w-5 h-5 mr-2' />
            <span className='truncate inline-block leading-6'>
              Continue with Twitter
            </span>
          </Link>
        </>
      )}
      {user && (
        <>
          <p>
            Wasssssuppp {user.name.split(' ')[0]}! We’re syncing your data from
            Twitter as fast as we can...
          </p>
          <p className='mt-2.5'>
            Hold tight; soon you’ll be able to filter and sort your own
            lists—using the full power of PostgreSQL—to your heart’s content.
          </p>
        </>
      )}
    </aside>
  );
}
