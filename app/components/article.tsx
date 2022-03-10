import { useLoaderData } from 'remix';

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
      <div className='text-sm text-slate-500 dark:text-slate-400 flex items-center mt-1.5'>
        <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
          {tweets
            .sort((a, b) => b.score.rank - a.score.rank)
            .slice(0, 10)
            .map(({ id, author }) => (
              <a
                className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 -mr-2 first:mr-0 overflow-hidden'
                href={`https://hive.one/p/${author.username}`}
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
        <a
          className='ml-1 hover:underline cursor-pointer'
          href={`https://twitter.com/search?q=${encodeURIComponent(
            expanded_url
          )}`}
          rel='noopener noreferrer'
          target='_blank'
        >
          {tweets.length} tweet
          {tweets.length > 1 && 's'}
        </a>
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
    </li>
  );
}
