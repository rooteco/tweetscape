import { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { useSearchParams } from 'remix';

import {
  ArticleTweetsFilter,
  ArticleTweetsSort,
  DEFAULT_ARTICLES_FILTER,
} from '~/query';
import type { Article } from '~/types';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import SortIcon from '~/icons/sort';
import { TimeAgo } from '~/components/timeago';
import TweetItem from '~/components/tweet';
import { substr } from '~/utils';

export type ArticleItemProps = Article;

export default function ArticleItem({
  url,
  unwound_url,
  attention_score,
  title,
  description,
  tweets,
}: ArticleItemProps) {
  const [hidden, setHidden] = useState(true);
  const earliestTweet = useMemo(
    () =>
      Array.from(tweets).sort(
        (a, b) =>
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
      )[0],
    [tweets]
  );
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
      Array.from(tweets)
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
    [sort, filter, tweets]
  );
  return (
    <li className='text-sm p-3 border-b border-slate-200 dark:border-slate-800'>
      <div className='flex items-center'>
        <a
          data-cy='title'
          className='font-semibold hover:underline text-base truncate'
          href={unwound_url ?? url}
          target='_blank'
          rel='noopener noreferrer'
        >
          {title || (unwound_url ?? url).replace(/^https?:\/\/(www\.)?/, '')}
        </a>
        <span className='ml-1 text-sm text-slate-500 block flex-none'>
          (
          <a
            data-cy='domain'
            className='hover:underline'
            href={`https://${new URL(unwound_url ?? url).hostname.replace(
              /^www\./,
              ''
            )}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {new URL(unwound_url ?? url).hostname.replace(/^www\./, '')}
          </a>
          )
        </span>
      </div>
      {description && (
        <p data-cy='description' className='text-sm'>
          {substr(description, 235)}
        </p>
      )}
      <div className='text-sm text-slate-500 flex items-center mt-1.5'>
        <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
          {Array.from(tweets)
            .sort((a, b) =>
              b.score && a.score
                ? Number(b.score.attention_score) -
                  Number(a.score.attention_score)
                : 0
            )
            .slice(0, 10)
            .reverse()
            .map(({ id, author }) => (
              <a
                className='inline-block cursor-pointer duration-75 transition-transform hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 -mr-2 first:mr-0 overflow-hidden'
                href={`https://twitter.com/${author.username}/status/${id}`}
                rel='noopener noreferrer'
                target='_blank'
                key={id}
              >
                <img
                  width={25}
                  height={25}
                  src={`/img/${encodeURIComponent(
                    author.profile_image_url ?? ''
                  )}?width=25&height=25&fit=cover`}
                  alt=''
                />
              </a>
            ))}
        </span>
        <button
          type='button'
          aria-pressed={!hidden}
          className='ml-1 hover:underline cursor-pointer'
          onClick={() => setHidden((prev) => !prev)}
        >
          {tweets.length} tweet
          {tweets.length > 1 && 's'}
        </button>
        <span className='mx-1'>·</span>
        {attention_score && (
          <>
            <a
              className='hover:underline'
              href='https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18'
              target='_blank'
              rel='noopener noreferrer'
            >
              {Math.round(attention_score)} points
            </a>
            <span className='mx-1'>·</span>
          </>
        )}
        <a
          className='hover:underline'
          href={`https://twitter.com/${earliestTweet.author.username}/status/${earliestTweet.id}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <TimeAgo datetime={earliestTweet.created_at} locale='en_short' />
        </a>
      </div>
      <section
        data-cy='tweets'
        className={cn('-mx-3 -mb-3 max-h-96 overflow-y-auto', { hidden })}
      >
        <nav className='text-xs p-3 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'>
          <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
          <button
            type='button'
            aria-pressed={sort === ArticleTweetsSort.AttentionScore}
            className={cn({
              underline: sort === ArticleTweetsSort.AttentionScore,
            })}
            onClick={() => setSort(ArticleTweetsSort.AttentionScore)}
          >
            attention score
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === ArticleTweetsSort.RetweetCount}
            className={cn({
              underline: sort === ArticleTweetsSort.RetweetCount,
            })}
            onClick={() => setSort(ArticleTweetsSort.RetweetCount)}
          >
            retweet count
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === ArticleTweetsSort.Latest}
            className={cn({ underline: sort === ArticleTweetsSort.Latest })}
            onClick={() => setSort(ArticleTweetsSort.Latest)}
          >
            latest
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === ArticleTweetsSort.Earliest}
            className={cn({ underline: sort === ArticleTweetsSort.Earliest })}
            onClick={() => setSort(ArticleTweetsSort.Earliest)}
          >
            earliest
          </button>
          <FilterIcon className='fill-current h-4 w-4 ml-4 mr-1.5 inline-block' />
          <button
            type='button'
            aria-pressed={filter === ArticleTweetsFilter.HideRetweets}
            className={cn({
              underline: filter === ArticleTweetsFilter.HideRetweets,
            })}
            onClick={() => setFilter(ArticleTweetsFilter.HideRetweets)}
          >
            hide retweets
          </button>
          {' · '}
          <button
            type='button'
            disabled={searchParamsFilter === ArticleTweetsFilter.HideRetweets}
            aria-pressed={filter === ArticleTweetsFilter.ShowRetweets}
            className={cn('disabled:cursor-not-allowed', {
              underline: filter === ArticleTweetsFilter.ShowRetweets,
            })}
            onClick={() => setFilter(ArticleTweetsFilter.ShowRetweets)}
          >
            show retweets
          </button>
        </nav>
        {!results.length && (
          <Empty className='m-3 h-48'>No tweets to show</Empty>
        )}
        {!!results.length && (
          <ol>
            {results.map((tweet) => (
              <TweetItem tweet={tweet} key={tweet.id} />
            ))}
          </ol>
        )}
      </section>
    </li>
  );
}
