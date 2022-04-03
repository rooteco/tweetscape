import { Link, useLocation, useOutletContext, useSearchParams } from 'remix';
import { useEffect, useMemo, useRef } from 'react';

import {
  ArticleTweetsFilter,
  ArticleTweetsSort,
  ArticlesFilter,
  DEFAULT_ARTICLES_FILTER,
  Param,
} from '~/query';
import type { Article } from '~/types';
import BoltIcon from '~/icons/bolt';
import CloseIcon from '~/icons/close';
import Column from '~/components/column';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
import Switcher from '~/components/switcher';
import { TimeAgo } from '~/components/timeago';
import TweetItem from '~/components/tweet';

export default function ArticlePage() {
  const article = useOutletContext<Article | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const articlesFilter = Number(
    searchParams.get(Param.ArticlesFilter) ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;

  const defaultSort = ArticleTweetsSort.AttentionScore;
  const defaultFilter = articlesFilter;

  const sort = Number(
    searchParams.get(Param.ArticleTweetsSort) ?? defaultSort
  ) as ArticleTweetsSort;
  const filter = Number(
    searchParams.get(Param.ArticleTweetsFilter) ?? defaultFilter
  ) as ArticleTweetsFilter;

  useEffect(() => {
    if (
      articlesFilter === ArticlesFilter.HideRetweets &&
      filter !== ArticleTweetsFilter.HideRetweets
    ) {
      const prev = Object.fromEntries(searchParams.entries());
      setSearchParams({
        ...prev,
        [Param.ArticleTweetsFilter]: `${ArticleTweetsFilter.HideRetweets}`,
      });
    }
  }, [articlesFilter, searchParams, setSearchParams, filter]);

  const results = useMemo(
    () =>
      Array.from(article?.tweets ?? [])
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
    [sort, filter, article]
  );
  const { pathname } = useLocation();
  const scrollerRef = useRef<HTMLElement>(null);
  return (
    <Column
      ref={scrollerRef}
      className='w-[36rem] border-r border-gray-200 dark:border-gray-800'
    >
      <Nav scrollerRef={scrollerRef}>
        <Link
          to={pathname.split('/').slice(0, 4).join('/')}
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
                  to: `?${Param.ArticleTweetsSort}=${ArticleTweetsSort.AttentionScore}`,
                  isActiveByDefault:
                    defaultSort === ArticleTweetsSort.AttentionScore,
                },
                {
                  name: 'Retweet count',
                  to: `?${Param.ArticleTweetsSort}=${ArticleTweetsSort.RetweetCount}`,
                },
                {
                  name: 'Latest first',
                  to: `?${Param.ArticleTweetsSort}=${ArticleTweetsSort.Latest}`,
                },
                {
                  name: 'Earliest first',
                  to: `?${Param.ArticleTweetsSort}=${ArticleTweetsSort.Earliest}`,
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
                  to: `?${Param.ArticleTweetsFilter}=${ArticleTweetsFilter.HideRetweets}`,
                  isActiveByDefault:
                    defaultFilter === ArticlesFilter.HideRetweets,
                },
                {
                  name: 'Show retweets',
                  to: `?${Param.ArticleTweetsFilter}=${ArticleTweetsFilter.ShowRetweets}`,
                  isActiveByDefault:
                    defaultFilter === ArticlesFilter.ShowRetweets,
                },
              ],
            },
          ]}
        />
      </Nav>
      {!results.length && (
        <Empty className='m-3 h-48 flex-1'>No tweets to show</Empty>
      )}
      {!!results.length && (
        <div className='relative'>
          {results.map((tweet) => (
            <TweetItem tweet={tweet} key={tweet.id.toString()} />
          ))}
        </div>
      )}
    </Column>
  );
}
