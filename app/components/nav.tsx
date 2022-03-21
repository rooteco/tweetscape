import { Link, useLocation, useSearchParams } from 'remix';
import cn from 'classnames';

import type { Filter, Sort } from '~/query.server';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';

export default function Nav() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isList = /lists/.test(pathname);
  const defaultSort: Sort = isList ? 'tweets_count' : 'attention_score';
  const sort = (searchParams.get('sort') ?? defaultSort) as Sort;
  const filter = (searchParams.get('filter') ?? 'hide_retweets') as Filter;
  return (
    <nav className='text-xs p-3 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'>
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
