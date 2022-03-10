import cn from 'classnames';
import { useLoaderData } from 'remix';
import { useState } from 'react';

import type { Article } from '~/db.server';
import type { LoaderData } from '~/routes/$cluster';

function substr(str: string, len: number): string {
  return `${str.substr(0, len).trim()}${str.length > len ? '…' : ''}`;
}

export default function ArticleItem({
  expanded_url,
  title,
  description,
  tweets,
}: Article) {
  const { locale } = useLoaderData<LoaderData>();
  const [hidden, setHidden] = useState(true);
  return (
    <li className='my-8'>
      <div>
        <a
          className='font-semibold hover:underline text-base'
          href={expanded_url}
          target='_blank'
          rel='noopener noreferrer'
        >
          {title ||
            substr(expanded_url.replace(/^https?:\/\/(www\.)?/, ''), 50)}
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
          {tweets
            .sort((a, b) => b.score.rank - a.score.rank)
            .slice(0, 10)
            .map(({ id, author }) => (
              <a
                className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 -mr-2 first:mr-0 overflow-hidden'
                href={`https://twitter.com/${author.username}/status/${id}`}
                rel='noopener noreferrer'
                target='_blank'
                key={id}
              >
                <img
                  src={`/img/${encodeURIComponent(author.profile_image_url)}`}
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
        <span>
          {new Date(tweets[0].created_at).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span className='mx-1'>·</span>
        <span>
          {new Date(tweets[0].created_at).toLocaleString(locale, {
            hour: 'numeric',
            minute: 'numeric',
          })}
        </span>
      </div>
      <div
        className={cn(
          'mt-2.5 pb-2.5 flex flex-wrap overflow-auto border-b border-black dark:border-white max-h-96',
          { hidden }
        )}
      >
        {tweets
          .sort((a, b) => b.score.rank - a.score.rank)
          .map(({ id, author, score, text, created_at }) => (
            <div key={id} className='flex p-2 w-full sm:w-1/2'>
              <div className='flex-grow rounded border border-slate-900 dark:border-white py-3 px-4'>
                <div className='flex items-center justify-between w-full'>
                  <div className='flex'>
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
                  <a
                    className='hover:underline block font-bold text-xs'
                    href={`https://hive.one/p/${author.username}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {score.attention_score.toFixed(2)} points
                  </a>
                </div>
                <p className='mt-3 text-xs text-justify'>
                  {text}
                  <a
                    className='hover:underline font-bold text-xs ml-2'
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
                </p>
              </div>
            </div>
          ))}
      </div>
    </li>
  );
}
