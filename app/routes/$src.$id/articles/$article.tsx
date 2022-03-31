import { Link, useLocation, useOutletContext, useSearchParams } from 'remix';
import { useEffect, useMemo } from 'react';

import {
  ArticleTweetsFilter,
  ArticleTweetsSort,
  DEFAULT_ARTICLES_FILTER,
} from '~/query';
import type { Article } from '~/types';
import BoltIcon from '~/icons/bolt';
import CloseIcon from '~/icons/close';
import Column from '~/components/column';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';
import Switcher from '~/components/switcher';
import { TimeAgo } from '~/components/timeago';
import TweetItem from '~/components/tweet';

export default function ArticlePage() {
  const article = useOutletContext<Article>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsFilter = Number(
    searchParams.get('filter') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticleTweetsFilter;

  useEffect(() => {
    if (searchParamsFilter === ArticleTweetsFilter.HideRetweets) {
      const prev = Object.fromEntries(searchParams.entries());
      setSearchParams({ ...prev, f: `${ArticleTweetsFilter.HideRetweets}` });
    }
  }, [searchParamsFilter, searchParams, setSearchParams]);

  const defaultSort = ArticleTweetsSort.AttentionScore;
  const defaultFilter = searchParamsFilter;

  const sort = Number(
    searchParams.get('s') ?? defaultSort
  ) as ArticleTweetsSort;
  const filter = Number(
    searchParams.get('f') ?? defaultFilter
  ) as ArticleTweetsFilter;

  const results = useMemo(
    () =>
      Array.from(article.tweets)
        .filter(
          (t) =>
            filter === ArticleTweetsFilter.ShowRetweets ||
            !/^RT @\w+\b:/.test(t.text)
        )
        .sort((a, b) => {
          if (sort === ArticleTweetsSort.RetweetCount)
            return (
              b.retweet_count +
              b.quote_count -
              (a.retweet_count + a.quote_count)
            );
          if (sort === ArticleTweetsSort.Latest)
            return (
              new Date(b.created_at).valueOf() -
              new Date(a.created_at).valueOf()
            );
          if (sort === ArticleTweetsSort.Earliest)
            return (
              new Date(a.created_at).valueOf() -
              new Date(b.created_at).valueOf()
            );
          if (b.score && a.score)
            return (
              Number(b.score.attention_score) - Number(a.score.attention_score)
            );
          return 0;
        }),
    [sort, filter, article.tweets]
  );
  const { pathname } = useLocation();
  return (
    <Column className='w-[36rem] border-x border-gray-200 dark:border-gray-800'>
      <nav className='sticky top-0 z-10 bg-white/75 dark:bg-gray-900/75 backdrop-blur-sm p-1.5 flex items-stretch border-b border-gray-200 dark:border-gray-800'>
        <Link
          to={pathname.replaceAll(`/${encodeURIComponent(article.url)}`, '')}
          className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        >
          <CloseIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          <span>Close</span>
        </Link>
        <div className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'>
          <BoltIcon />
          <span>
            Synced <TimeAgo datetime={new Date()} locale='en_short' />
          </span>
        </div>
        <Switcher
          icon={<SortIcon className='fill-current h-4 w-4 mr-1 inline-block' />}
          sections={[
            {
              header: 'Sort by',
              links: [
                {
                  name: 'Attention score',
                  to: `?s=${ArticleTweetsSort.AttentionScore}`,
                  isActiveByDefault:
                    defaultSort === ArticleTweetsSort.AttentionScore,
                },
                {
                  name: 'Retweet count',
                  to: `?s=${ArticleTweetsSort.RetweetCount}`,
                },
                {
                  name: 'Latest first',
                  to: `?s=${ArticleTweetsSort.Latest}`,
                },
                {
                  name: 'Earliest first',
                  to: `?s=${ArticleTweetsSort.Earliest}`,
                },
              ],
            },
          ]}
        />
        <Switcher
          icon={
            <FilterIcon className='fill-current h-4 w-4 mr-1 inline-block' />
          }
          sections={[
            {
              header: 'Filter',
              links: [
                {
                  name: 'Hide retweets',
                  to: `?f=${ArticleTweetsFilter.HideRetweets}`,
                  isActiveByDefault:
                    defaultFilter === ArticleTweetsFilter.HideRetweets,
                },
                {
                  name: 'Show retweets',
                  to: `?f=${ArticleTweetsFilter.ShowRetweets}`,
                  isActiveByDefault:
                    defaultFilter === ArticleTweetsFilter.ShowRetweets,
                },
              ],
            },
          ]}
        />
      </nav>
      {!results.length && <Empty className='m-3 h-48'>No tweets to show</Empty>}
      {!!results.length && (
        <div className='relative'>
          {results.map((tweet) => (
            <TweetItem tweet={tweet} key={tweet.id} />
          ))}
        </div>
      )}
    </Column>
  );
}
