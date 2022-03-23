import type { ReactNode } from 'react';
import cn from 'classnames';

import type { Influencer, Tweet } from '~/types';
import LikeIcon from '~/icons/like';
import ReplyIcon from '~/icons/reply';
import RetweetIcon from '~/icons/retweet';
import ShareIcon from '~/icons/share';
import { TimeAgo } from '~/components/timeago';

function num(n: number): string {
  if (n > 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n > 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

type ActionProps = {
  count?: number;
  color: string;
  icon: ReactNode;
  href: string;
};

function Action({ count, color, icon, href }: ActionProps) {
  return (
    <a
      data-cy='share'
      className={cn(
        'mr-5 grow shrink basis-0 inline-flex justify-start items-center transition duration-[0.2s] group',
        {
          'hover:text-red-550': color === 'red',
          'hover:text-blue-550': color === 'blue',
          'hover:text-green-550': color === 'green',
        }
      )}
      href={href}
      target='_blank'
      rel='noopener noreferrer'
    >
      <div
        className={cn('p-1.5 mr-0.5 rounded-full transition duration-[0.2s]', {
          'group-hover:bg-red-50': color === 'red',
          'group-hover:bg-blue-50': color === 'blue',
          'group-hover:bg-green-50': color === 'green',
        })}
      >
        {icon}
      </div>
      {count}
    </a>
  );
}

export type TweetItemProps = Partial<Tweet> & {
  author?: Influencer;
  html?: string;
};

export default function TweetItem({
  id,
  author,
  retweet_count,
  quote_count,
  like_count,
  created_at,
  text,
  html,
}: TweetItemProps) {
  return (
    <li className='relative flex w-full text-sm border-b last-of-type:border-0 border-slate-200 dark:border-slate-800 p-3'>
      <a
        className={cn(
          'block flex-none mr-3 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden',
          { 'animate-pulse': !id }
        )}
        href={
          author && id
            ? `https://twitter.com/${author.username}/status/${id}`
            : ''
        }
        rel='noopener noreferrer'
        target='_blank'
        key={id}
      >
        {author?.profile_image_url && (
          <img
            src={`/img/${encodeURIComponent(
              author.profile_image_url
            )}?width=48&height=48&fit=cover`}
            alt=''
          />
        )}
      </a>
      <article className='flex-1 min-w-0'>
        <header className='mb-0.5 flex items-end'>
          <a
            href={author ? `https://hive.one/p/${author.username}` : ''}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'peer hover:underline block font-semibold min-w-0 shrink truncate',
              {
                'h-4 w-40 mt-1 mb-1.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded':
                  !id,
              }
            )}
          >
            {author?.name}
          </a>
          <span className='block peer pl-1 h-5' />
          <a
            data-cy='author'
            className={cn('peer text-slate-500 block flex-none', {
              'h-2.5 w-32 mb-1.5 ml-1.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded':
                !id,
            })}
            href={author ? `https://twitter.com/${author.username}` : ''}
            target='_blank'
            rel='noopener noreferrer'
          >
            {author ? `@${author.username}` : ''}
          </a>
          {id && <span className='mx-1 text-slate-500 block flex-none'>·</span>}
          <a
            data-cy='date'
            className='hover:underline text-slate-500 block flex-none'
            href={
              author && id
                ? `https://twitter.com/${author.username}/status/${id}`
                : ''
            }
            target='_blank'
            rel='noopener noreferrer'
          >
            {created_at && <TimeAgo datetime={created_at} locale='en_short' />}
          </a>
          {author && (
            <article className='peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible shadow-xl invisible opacity-0 transition-[opacity,visibility] absolute top-10 left-10 z-10 hover:delay-500 peer-hover:delay-500 duration-300 ease-in-out w-72 p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg'>
              <div className='absolute -top-2.5 left-0 right-0 h-2.5 transparent' />
              <header>
                <div className='flex justify-between items-start'>
                  <a
                    className='block w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'
                    href={`https://twitter.com/${author.username}/status/${id}`}
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    {author.profile_image_url && (
                      <img
                        src={`/img/${encodeURIComponent(
                          author.profile_image_url
                        )}?width=64&height=64&fit=cover`}
                        alt=''
                      />
                    )}
                  </a>
                  <a
                    className='block py-2.5 px-5 rounded-full bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    href={`https://twitter.com/intent/user?screen_name=${author.username}`}
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    Follow
                  </a>
                </div>
                <a
                  className='block hover:underline mt-2 leading-none font-semibold text-base'
                  href={`https://twitter.com/${author.username}`}
                  rel='noopener noreferrer'
                  target='_blank'
                >
                  {author.name}
                </a>
                <a
                  className='block mt-1 leading-none text-slate-500'
                  href={`https://twitter.com/${author.username}`}
                  rel='noopener noreferrer'
                  target='_blank'
                >
                  @{author.username}
                </a>
              </header>
              <p className='my-3'>{author.description}</p>
              <p>
                <a
                  className='hover:underline mr-3'
                  href={`https://twitter.com/${author.username}/following`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <span className='font-semibold'>
                    {num(author.following_count ?? 0)}
                  </span>
                  <span className='text-slate-500'> Following</span>
                </a>
                <a
                  className='hover:underline mr-3'
                  href={`https://twitter.com/${author.username}/followers`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <span className='font-semibold'>
                    {num(author.followers_count ?? 0)}
                  </span>
                  <span className='text-slate-500'> Followers</span>
                </a>
              </p>
            </article>
          )}
        </header>
        <p
          data-cy='text'
          className={cn('mb-3', {
            'h-12 w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded':
              !id,
          })}
          dangerouslySetInnerHTML={{ __html: html ?? text ?? '' }}
        />
        <div className='-m-1.5 flex items-stretch min-w-0 justify-between text-slate-500'>
          <Action
            color='blue'
            icon={<ReplyIcon />}
            href={
              id ? `https://twitter.com/intent/tweet?in_reply_to=${id}` : ''
            }
          />
          <Action
            color='green'
            icon={<RetweetIcon />}
            href={id ? `https://twitter.com/intent/retweet?tweet_id=${id}` : ''}
            count={
              retweet_count && quote_count
                ? retweet_count + quote_count
                : undefined
            }
          />
          <Action
            color='red'
            icon={<LikeIcon />}
            href={id ? `https://twitter.com/intent/like?tweet_id=${id}` : ''}
            count={like_count}
          />
          <Action
            color='blue'
            icon={<ShareIcon />}
            href={
              author && id
                ? `https://twitter.com/${author.username}/status/${id}`
                : ''
            }
          />
        </div>
      </article>
    </li>
  );
}
