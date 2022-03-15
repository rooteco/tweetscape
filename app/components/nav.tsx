import { Link, useSearchParams } from 'remix';
import cn from 'classnames';

import type { Filter, Sort } from '~/routes/$cluster';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';

export default function Nav() {
  const [searchParams] = useSearchParams();
  const sort = (searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (searchParams.get('filter') ?? 'hide_retweets') as Filter;
  return (
    <nav className='text-xs mt-2'>
      <SortIcon />
      <Link
        className={cn({ underline: sort === 'attention_score' })}
        to={`?filter=${filter}&sort=attention_score`}
      >
        attention score
      </Link>
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
