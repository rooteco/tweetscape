import { Link, useSearchParams } from 'remix';
import cn from 'classnames';

import type { Filter, Sort } from '~/routes/$cluster';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';
import Tooltip from '~/components/tooltip';

export default function Nav() {
  const [searchParams] = useSearchParams();
  const sort = (searchParams.get('sort') ?? 'attention_score') as Sort;
  const filter = (searchParams.get('filter') ?? 'hide_retweets') as Filter;
  return (
    <nav className='text-xs mt-2'>
      <SortIcon />
      <Tooltip
        content={
          <>
            <p>
              Show articles with higher{' '}
              <a
                className='underline'
                href='https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18'
                target='_blank'
                rel='noopener noreferrer'
              >
                attention score
              </a>{' '}
              sums first.
            </p>
            <p className='mt-1'>
              Each articles attention score sum is calculated by adding together
              the attention scores of each of the articles’ tweets’ authors.
              Those author attention scores are generated by{' '}
              <a
                className='underline'
                href='https://borgcollective.notion.site/About-15b9db2c1f414cf998c5abc58b715176'
                target='_blank'
                rel='noopener noreferrer'
              >
                the Borg Collective
              </a>{' '}
              for{' '}
              <a
                className='underline'
                href='https://hive.one'
                target='_blank'
                rel='noopener noreferrer'
              >
                Hive
              </a>{' '}
              using their{' '}
              <a
                className='underline'
                href='https://hivedotone.substack.com/p/algorithm-v-21-is-now-live'
                target='_blank'
                rel='noopener noreferrer'
              >
                latest proprietary algorithm for trust
              </a>
              .
            </p>
          </>
        }
      >
        <Link
          className={cn({ underline: sort === 'attention_score' })}
          to={`?filter=${filter}&sort=attention_score`}
        >
          attention score
        </Link>
      </Tooltip>
      {' · '}
      <Tooltip content='Show articles with more influencer tweets first.'>
        <Link
          className={cn({ underline: sort === 'tweets_count' })}
          to={`?filter=${filter}&sort=tweets_count`}
        >
          tweets count
        </Link>
      </Tooltip>
      <FilterIcon />
      <Tooltip content='Exclude retweets from your ranking algorithm.'>
        <Link
          className={cn({ underline: filter === 'hide_retweets' })}
          to={`?filter=hide_retweets&sort=${sort}`}
        >
          hide retweets
        </Link>
      </Tooltip>
      {' · '}
      <Tooltip content='Include retweets in your ranking algorithm.'>
        <Link
          className={cn({ underline: filter === 'show_retweets' })}
          to={`?filter=show_retweets&sort=${sort}`}
        >
          show retweets
        </Link>
      </Tooltip>
    </nav>
  );
}
