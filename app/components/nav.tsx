import { Link, useLocation, useSearchParams } from 'remix';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import cn from 'classnames';

import type { Filter, Sort } from '~/query';
import { DEFAULT_FILTER } from '~/query';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';

export type NavProps = { scrollerRef: RefObject<HTMLElement | null> };

export default function Nav({ scrollerRef }: NavProps) {
  const [visible, setVisible] = useState<boolean>(true);
  const lastScrollPosition = useRef<number>(0);

  useEffect(() => {
    if (!scrollerRef.current) return () => {};
    const scroller = scrollerRef.current;
    function handleScroll(): void {
      const currentScrollPosition = scroller.scrollTop;
      const prevScrollPosition = lastScrollPosition.current;
      lastScrollPosition.current = currentScrollPosition;
      setVisible(() => {
        const scrolledUp = currentScrollPosition < prevScrollPosition;
        const scrolledToTop = currentScrollPosition < 10;
        return scrolledUp || scrolledToTop;
      });
    }
    scroller.addEventListener('scroll', handleScroll);
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, [scrollerRef]);

  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isList = /lists/.test(pathname);
  const defaultSort: Sort = isList ? 'tweets_count' : 'attention_score';
  const sort = (searchParams.get('sort') ?? defaultSort) as Sort;
  const filter = (searchParams.get('filter') ?? DEFAULT_FILTER) as Filter;
  return (
    <nav
      className={cn(
        'text-xs p-3 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-all',
        {
          'opacity-0 -top-5 pointer-events-none': !visible,
          'opacity-1 top-0': visible,
        }
      )}
    >
      <SortIcon />
      {!isList && (
        <Link
          className={cn({ underline: sort === 'attention_score' })}
          to={`?filter=${filter}&sort=attention_score`}
        >
          attention score
        </Link>
      )}
      {isList && <span className='cursor-not-allowed'>attention score</span>}
      {' · '}
      <Link
        className={cn({ underline: sort === 'tweets_count' })}
        to={`?filter=${filter}&sort=tweets_count`}
      >
        tweets count
      </Link>
      <FilterIcon />
      <Link
        className={cn({ underline: filter === 'hide_retweets' })}
        to={`?filter=hide_retweets&sort=${sort}`}
      >
        hide retweets
      </Link>
      {' · '}
      <Link
        className={cn({ underline: filter === 'show_retweets' })}
        to={`?filter=show_retweets&sort=${sort}`}
      >
        show retweets
      </Link>
    </nav>
  );
}
