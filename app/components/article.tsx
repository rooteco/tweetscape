import { useLoaderData, useSearchParams } from 'remix';
import { useMemo, useState } from 'react';
import cn from 'classnames';

import type { Article } from '~/db.server';
import FilterIcon from '~/icons/filter';
import type { LoaderData } from '~/routes/$cluster';
import SortIcon from '~/icons/sort';
import TweetItem from '~/components/tweet';

function substr(str: string, len: number): string {
  return `${str.substr(0, len).trim()}${str.length > len ? '…' : ''}`;
}

type Sort = 'attention_score' | 'retweet_count' | 'latest' | 'earliest';
type Filter = 'show_retweets' | 'hide_retweets';

export type ArticleItemProps = Article;

export default function ArticleItem({
  expanded_url,
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
          return b.score.attention_score - a.score.attention_score;
        }),
    [sort, filter, tweets]
  );
  return (
    <li className='my-8'>
      <div>
        <a
          className='font-semibold hover:underline text-base'
          href={expanded_url}
          target='_blank'
          rel='noopener noreferrer'
        >
          {substr(
            title || expanded_url.replace(/^https?:\/\/(www\.)?/, ''),
            100
          )}
        </a>{' '}
        <span className='text-sm'>
          (
          <a
            className='hover:underline'
            href={`https://${new URL(expanded_url).hostname.replace(
              /^www\./,
              ''
            )}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {new URL(expanded_url).hostname.replace(/^www\./, '')}
          </a>
          )
        </span>
      </div>
      {description && <p className='text-sm'>{substr(description, 285)}</p>}
      <div className='text-sm text-slate-600 dark:text-slate-400 flex items-center mt-1.5'>
        <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
          {Array.from(tweets)
            .sort((a, b) => b.score.attention_score - a.score.attention_score)
            .slice(0, 10)
            .reverse()
            .map(({ id, author }) => (
              <a
                className='inline-block cursor-pointer duration-75 transition-transform hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 -mr-2 first:mr-0 overflow-hidden'
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
        <a
          className='hover:underline'
          href='https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18'
          target='_blank'
          rel='noopener noreferrer'
        >
          {Math.round(attention_score)} points
        </a>
        <span className='mx-1'>·</span>
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
      <div
        className={cn('border-b border-black dark:border-white', { hidden })}
      >
        <nav className='text-xs my-2.5'>
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
            title={
              searchParamsFilter === 'hide_retweets'
                ? 'Cannot show retweets when filtering them out at the article level; click "show tweets" at the top level (below the "tweetscape.co" logo) to use this filter.'
                : undefined
            }
          >
            show retweets
          </button>
        </nav>
        <ul className='pb-2.5 flex flex-wrap overflow-auto max-h-96'>
          {results.map((tweet, idx) => (
            <TweetItem {...tweet} key={tweet.id} order={idx} />
          ))}
        </ul>
      </div>
    </li>
  );
}
