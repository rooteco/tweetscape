import { Link, useLocation, useSearchParams } from 'remix';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import cn from 'classnames';

import { ArticlesFilter, ArticlesSort, DEFAULT_ARTICLE_FILTER } from '~/query';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';

export type NavProps = {
  header: string;
  scrollerRef: RefObject<HTMLElement | null>;
};

export default function Nav({ header, scrollerRef }: NavProps) {
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
  const defaultSort = isList
    ? ArticlesSort.TweetsCount
    : ArticlesSort.AttentionScore;
  const sort = Number(searchParams.get('sort') ?? defaultSort) as ArticlesSort;
  const filter = Number(
    searchParams.get('filter') ?? DEFAULT_ARTICLE_FILTER
  ) as ArticlesFilter;
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
      <h2 className='inline font-semibold mr-4'>{header}</h2>
      <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
      {!isList && (
        <Link
          className={cn({ underline: sort === ArticlesSort.AttentionScore })}
          to={`?filter=${filter}&sort=${ArticlesSort.AttentionScore}`}
        >
          attention score
        </Link>
      )}
      {isList && <span className='cursor-not-allowed'>attention score</span>}
      {' · '}
      <Link
        className={cn({ underline: sort === ArticlesSort.TweetsCount })}
        to={`?filter=${filter}&sort=${ArticlesSort.TweetsCount}`}
      >
        tweets count
      </Link>
      <FilterIcon className='fill-current h-4 w-4 ml-4 mr-1.5 inline-block' />
      <Link
        className={cn({ underline: filter === ArticlesFilter.HideRetweets })}
        to={`?filter=${ArticlesFilter.HideRetweets}&sort=${sort}`}
      >
        hide retweets
      </Link>
      {' · '}
      <Link
        className={cn({ underline: filter === ArticlesFilter.ShowRetweets })}
        to={`?filter=${ArticlesFilter.ShowRetweets}&sort=${sort}`}
      >
        show retweets
      </Link>
    </nav>
  );
}
