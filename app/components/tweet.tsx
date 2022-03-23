import { Form, useTransition } from 'remix';
import type { ReactNode } from 'react';
import cn from 'classnames';

import LikeIcon from '~/icons/like';
import LikedIcon from '~/icons/liked';
import Profile from '~/components/profile';
import ReplyIcon from '~/icons/reply';
import RetweetIcon from '~/icons/retweet';
import ShareIcon from '~/icons/share';
import { TimeAgo } from '~/components/timeago';
import type { TweetFull } from '~/types';
import { num } from '~/utils';

type ActionProps = {
  active?: boolean;
  count?: number;
  color: string;
  icon: ReactNode;
  action: string;
  id?: string;
};

function Action({ active, count, color, icon, action, id }: ActionProps) {
  const transition = useTransition();
  return (
    <Form
      className='grow shrink basis-0 mr-5 h-8'
      method={active ? 'delete' : 'post'}
      action={`/actions/${action}/${id}`}
    >
      <button
        type='submit'
        disabled={transition.state === 'submitting'}
        className={cn(
          'disabled:cursor-wait inline-flex justify-start items-center transition duration-[0.2s] group',
          {
            'hover:text-red-550 active:text-red-550': color === 'red',
            'hover:text-blue-550 active:text-blue-550': color === 'blue',
            'hover:text-green-550 active:text-green-550': color === 'green',
            'text-red-550': color === 'red' && active,
            'text-blue-550': color === 'blue' && active,
            'text-green-550': color === 'green' && active,
          }
        )}
      >
        <div
          className={cn(
            'p-1.5 mr-0.5 rounded-full transition duration-[0.2s]',
            {
              'group-hover:bg-red-50 group-active:bg-red-50': color === 'red',
              'group-hover:bg-blue-50 group-active:bg-blue-50':
                color === 'blue',
              'group-hover:bg-green-50 group-active:bg-green-50':
                color === 'green',
            }
          )}
        >
          {icon}
        </div>
        {!!count && num(count)}
      </button>
    </Form>
  );
}

function TweetInner({
  id,
  author,
  retweet_count,
  quote_count,
  like_count,
  created_at,
  liked,
  text,
  html,
}: Partial<TweetFull>) {
  return (
    <article className='flex pl-3 pr-3 pb-3 relative'>
      <a
        className={cn(
          'block flex-none mr-3 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden',
          { 'animate-pulse': !id }
        )}
        href={author ? `https://twitter.com/${author.username}` : ''}
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
      <div className='flex-1 min-w-0'>
        <header className='mb-0.5 flex items-end'>
          <a
            href={author ? `https://twitter.com/${author.username}` : ''}
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
          {author && <Profile {...author} />}
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
          <Action color='blue' icon={<ReplyIcon />} action='reply' id={id} />
          <Action
            color='green'
            icon={<RetweetIcon />}
            action='retweet'
            id={id}
            count={
              retweet_count !== undefined && quote_count !== undefined
                ? retweet_count + quote_count
                : undefined
            }
          />
          <Action
            color='red'
            icon={liked ? <LikedIcon /> : <LikeIcon />}
            action='like'
            id={id}
            count={
              like_count !== undefined
                ? like_count + (liked ? 1 : 0)
                : undefined
            }
            active={liked}
          />
          <a
            type='submit'
            className='mr-5 grow shrink basis-0 inline-flex justify-start items-center transition duration-[0.2s] group hover:text-blue-550 active:text-blue-550'
            href={
              author && id
                ? `https://twitter.com/${author.username}/status/${id}`
                : ''
            }
            rel='noopener noreferrer'
            target='_blank'
          >
            <div className='p-1.5 mr-0.5 rounded-full transition duration-[0.2s] group-hover:bg-blue-50 group-active:bg-blue-50'>
              <ShareIcon />
            </div>
          </a>
        </div>
      </div>
    </article>
  );
}

export default function TweetItem({
  id,
  retweet,
  retweet_author,
  author,
  created_at,
  ...tweet
}: Partial<TweetFull>) {
  return (
    <li
      className={cn(
        'w-full text-sm border-b last-of-type:border-0 border-slate-200 dark:border-slate-800',
        { 'pt-3': !retweet, 'pt-2': retweet }
      )}
    >
      {retweet && author && (
        <header className='text-slate-500 text-xs px-3 mb-0.5'>
          <svg viewBox='0 0 24 24' className='ml-8 w-4 h-4 fill-current inline'>
            <g>
              <path d='M23.615 15.477c-.47-.47-1.23-.47-1.697 0l-1.326 1.326V7.4c0-2.178-1.772-3.95-3.95-3.95h-5.2c-.663 0-1.2.538-1.2 1.2s.537 1.2 1.2 1.2h5.2c.854 0 1.55.695 1.55 1.55v9.403l-1.326-1.326c-.47-.47-1.23-.47-1.697 0s-.47 1.23 0 1.697l3.374 3.375c.234.233.542.35.85.35s.613-.116.848-.35l3.375-3.376c.467-.47.467-1.23-.002-1.697zM12.562 18.5h-5.2c-.854 0-1.55-.695-1.55-1.55V7.547l1.326 1.326c.234.235.542.352.848.352s.614-.117.85-.352c.468-.47.468-1.23 0-1.697L5.46 3.8c-.47-.468-1.23-.468-1.697 0L.388 7.177c-.47.47-.47 1.23 0 1.697s1.23.47 1.697 0L3.41 7.547v9.403c0 2.178 1.773 3.95 3.95 3.95h5.2c.664 0 1.2-.538 1.2-1.2s-.535-1.2-1.198-1.2z' />
            </g>
          </svg>
          <a
            className='ml-3 font-bold hover:underline'
            href={`https://twitter.com/${author.username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            {author.name} Retweeted
          </a>
          <a
            className='ml-1 font-bold hover:underline'
            href={`https://twitter.com/${author.username}/status/${id}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            <TimeAgo datetime={created_at ?? new Date()} locale='en_short' />
          </a>
        </header>
      )}
      {retweet && <TweetInner {...retweet} author={retweet_author} />}
      {!retweet && (
        <TweetInner
          {...tweet}
          author={author}
          created_at={created_at}
          id={id}
        />
      )}
    </li>
  );
}
