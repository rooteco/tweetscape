import { Link, useLoaderData, useSearchParams } from 'remix';
import { useMemo, useState } from 'react';
import cn from 'classnames';

import type { Article } from '~/types';
import FilterIcon from '~/icons/filter';
import type { LoaderData } from '~/routes/clusters.$slug';
import SortIcon from '~/icons/sort';
import TweetItem from '~/components/tweet';
import { substr } from '~/utils';

type Sort = 'attention_score' | 'retweet_count' | 'latest' | 'earliest';
type Filter = 'show_retweets' | 'hide_retweets';

export type ArticleItemProps = Article;

export default function ArticleItem({
  url,
  unwound_url,
  attention_score,
  title,
  description,
  tweets,
}: ArticleItemProps) {
  const { locale } = useLoaderData<LoaderData>();
  const [hidden, setHidden] = useState(true);
  const earliestTweet = useMemo(
    () =>
      Array.from(tweets).sort(
        (a, b) =>
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
      )[0],
    [tweets]
  );
  const [sort, setSort] = useState<Sort>('attention_score');
  const [searchParams] = useSearchParams();
  const searchParamsSort = searchParams.get('sort') ?? 'attention_score';
  const searchParamsFilter = searchParams.get('filter') ?? 'hide_retweets';
  const [filter, setFilter] = useState<Filter>(searchParamsFilter as Filter);
  const results = useMemo(
    () =>
      Array.from(tweets)
        .filter(
          (t) => filter === 'show_retweets' || !/^RT @\w+\b:/.test(t.text)
        )
        .sort((a, b) => {
          if (sort === 'retweet_count')
            return b.retweet_count - a.retweet_count;
          if (sort === 'latest')
            return (
              new Date(b.created_at).valueOf() -
              new Date(a.created_at).valueOf()
            );
          if (sort === 'earliest')
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
                  src={`/img/${encodeURIComponent(
                    author.profile_image_url ?? ''
                  )}`}
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
          {new Date(earliestTweet.created_at).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
          })}
          {' · '}
          {new Date(earliestTweet.created_at).toLocaleString(locale, {
            hour: 'numeric',
            minute: 'numeric',
          })}
        </a>
      </div>
      <section
        data-cy='tweets'
        className={cn('-mx-3 -mb-3 max-h-96 overflow-y-auto', { hidden })}
      >
        <nav className='text-xs p-3 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'>
          <SortIcon />
          <button
            type='button'
            aria-pressed={sort === 'attention_score'}
            className={cn({ underline: sort === 'attention_score' })}
            onClick={() => setSort('attention_score')}
          >
            attention score
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === 'retweet_count'}
            className={cn({ underline: sort === 'retweet_count' })}
            onClick={() => setSort('retweet_count')}
          >
            retweet count
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === 'latest'}
            className={cn({ underline: sort === 'latest' })}
            onClick={() => setSort('latest')}
          >
            latest
          </button>
          {' · '}
          <button
            type='button'
            aria-pressed={sort === 'earliest'}
            className={cn({ underline: sort === 'earliest' })}
            onClick={() => setSort('earliest')}
          >
            earliest
          </button>
          <FilterIcon />
          <button
            type='button'
            aria-pressed={filter === 'hide_retweets'}
            className={cn({ underline: filter === 'hide_retweets' })}
            onClick={() => setFilter('hide_retweets')}
          >
            hide retweets
          </button>
          {' · '}
          <button
            type='button'
            disabled={searchParamsFilter === 'hide_retweets'}
            aria-pressed={filter === 'show_retweets'}
            className={cn('disabled:cursor-not-allowed', {
              underline: filter === 'show_retweets',
            })}
            onClick={() => setFilter('show_retweets')}
          >
            show retweets
          </button>
        </nav>
        <ol>
          {results.map((tweet) => (
            <TweetItem {...tweet} key={tweet.id} />
          ))}
        </ol>
      </section>
    </li>
  );
}
