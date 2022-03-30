import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'remix';
import cn from 'classnames';

import type { Article } from '~/types';
import {
  ArticleTweetsFilter,
  ArticleTweetsSort,
  DEFAULT_ARTICLES_FILTER,
} from '~/query';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';
import TweetItem from '~/components/tweet';

export default function ArticlePage() {
  const article = useOutletContext<Article>();
  const [sort, setSort] = useState(ArticleTweetsSort.AttentionScore);
  const [searchParams] = useSearchParams();
  const searchParamsFilter = useMemo(
    () =>
      Number(
        searchParams.get('filter') ?? DEFAULT_ARTICLES_FILTER
      ) as ArticleTweetsFilter,
    [searchParams]
  );
  const [filter, setFilter] = useState(searchParamsFilter);
  useEffect(() => {
    if (searchParamsFilter === ArticleTweetsFilter.HideRetweets)
      setFilter(ArticleTweetsFilter.HideRetweets);
  }, [searchParamsFilter]);
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
  return (
    <section className='p-5 flex-none flex flex-col max-w-xl overflow-y-scroll'>
      {!results.length && <Empty className='m-3 h-48'>No tweets to show</Empty>}
      {!!results.length && (
        <div className='relative'>
          {results.map((tweet) => (
            <TweetItem tweet={tweet} key={tweet.id} />
          ))}
        </div>
      )}
    </section>
  );
}
