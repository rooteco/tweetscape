import { useMemo, useState } from 'react';
import cn from 'classnames';
import { useLoaderData } from 'remix';

import type { Article } from '~/db.server';
import type { LoaderData } from '~/routes/$cluster';

function substr(str: string, len: number): string {
  return `${str.substr(0, len).trim()}${str.length > len ? '…' : ''}`;
}

type Sort = 'attention_score' | 'retweet_count' | 'latest' | 'earliest';

export default function ArticleItem({
  expanded_url,
  attention_score,
  title,
  description,
  tweets,
}: Article) {
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
  const sorted = useMemo(
    () =>
      Array.from(tweets).sort((a, b) => {
        if (sort === 'retweet_count') return b.retweet_count - a.retweet_count;
        if (sort === 'latest')
          return (
            new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf()
          );
        if (sort === 'earliest')
          return (
            new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
          );
        return b.score.attention_score - a.score.attention_score;
      }),
    [sort, tweets]
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
      {description && <p className='text-sm'>{substr(description, 300)}</p>}
      <div className='text-sm text-slate-600 dark:text-slate-400 flex items-center mt-1.5'>
        <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
          {Array.from(tweets)
            .sort((a, b) => b.score.attention_score - a.score.attention_score)
            .slice(0, 10)
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
          <svg
            className='fill-current h-4 w-4 mr-1.5 inline-block'
            xmlns='http://www.w3.org/2000/svg'
            height='24'
            viewBox='0 0 24 24'
            width='24'
          >
            <path d='M0 0h24v24H0z' fill='none' />
            <path d='M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z' />
          </svg>
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
        </nav>
        <ul className='pb-2.5 flex flex-wrap overflow-auto max-h-96'>
          {sorted.map(
            ({ id, author, score, text, created_at, retweet_count }, idx) => (
              <li key={id} order={idx} className='flex p-2 w-full sm:w-1/2'>
                <div className='flex-grow rounded border border-slate-900 dark:border-white py-3 px-4'>
                  <div className='flex items-center justify-between w-full'>
                    <div>
                      <a
                        className='hover:underline font-bold'
                        href={`https://hive.one/p/${author.username}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {author.username}
                      </a>
                      <a
                        className='mx-2 inline-flex justify-center items-center'
                        href={`https://twitter.com/${author.username}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        <svg
                          className='fill-current h-3'
                          viewBox='328 355 335 276'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            d='
                          M 630, 425
                          A 195, 195 0 0 1 331, 600
                          A 142, 142 0 0 0 428, 570
                          A  70,  70 0 0 1 370, 523
                          A  70,  70 0 0 0 401, 521
                          A  70,  70 0 0 1 344, 455
                          A  70,  70 0 0 0 372, 460
                          A  70,  70 0 0 1 354, 370
                          A 195, 195 0 0 0 495, 442
                          A  67,  67 0 0 1 611, 380
                          A 117, 117 0 0 0 654, 363
                          A  65,  65 0 0 1 623, 401
                          A 117, 117 0 0 0 662, 390
                          A  65,  65 0 0 1 630, 425
                          Z'
                          />
                        </svg>
                      </a>
                    </div>
                    <div className='text-xs text-slate-600 dark:text-slate-400'>
                      <span>{retweet_count} retweets</span>
                      <span className='mx-1'>·</span>
                      <a
                        className='hover:underline'
                        href={`https://hive.one/p/${author.username}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {Math.round(score.attention_score)} points
                      </a>
                      <span className='mx-1'>·</span>
                      <a
                        className='hover:underline'
                        href={`https://twitter.com/${author.username}/status/${id}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {new Date(created_at).toLocaleString(locale, {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {new Date(created_at).toLocaleString(locale, {
                          hour: 'numeric',
                          minute: 'numeric',
                        })}
                      </a>
                    </div>
                  </div>
                  <p className='mt-3 text-xs text-justify'>{text}</p>
                </div>
              </li>
            )
          )}
        </ul>
      </div>
    </li>
  );
}
