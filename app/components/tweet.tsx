import type { ReactNode } from 'react';

import type { Influencer, Tweet } from '~/types';
import LikeIcon from '~/icons/like';
import ReplyIcon from '~/icons/reply';
import RetweetIcon from '~/icons/retweet';
import ShareIcon from '~/icons/share';
import { TimeAgo } from '~/components/timeago';

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
      className={`mr-5 grow shrink basis-0 inline-flex justify-start items-center transition duration-[0.2s] group hover:text-${color}-550`}
      href={href}
      target='_blank'
      rel='noopener noreferrer'
    >
      <div
        className={`p-1.5 mr-0.5 rounded-full transition duration-[0.2s] group-hover:bg-${color}-50`}
      >
        {icon}
      </div>
      {count}
    </a>
  );
}

export type TweetItemProps = Tweet & {
  author: Influencer;
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
    <li className='flex w-full text-sm border-b last-of-type:border-0 border-slate-200 dark:border-slate-800 p-3'>
      <a
        className='cursor-pointer block flex-none mr-3 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'
        href={`https://twitter.com/${author.username}/status/${id}`}
        rel='noopener noreferrer'
        target='_blank'
        key={id}
      >
        <img
          src={`/img/${encodeURIComponent(author.profile_image_url ?? '')}`}
          alt=''
        />
      </a>
      <article className='flex-1 min-w-0'>
        <header className='mb-0.5 flex'>
          <a
            href={`https://hive.one/p/${author.username}`}
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline block font-semibold min-w-0 shrink truncate'
          >
            {author.name}
          </a>
          <a
            data-cy='author'
            className='text-slate-500 ml-1 block flex-none'
            href={`https://twitter.com/${author.username}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            @{author.username}
          </a>
          <span className='mx-1 text-slate-500 block flex-none'>·</span>
          <a
            data-cy='date'
            className='hover:underline text-slate-500 block flex-none'
            href={`https://twitter.com/${author.username}/status/${id}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <TimeAgo datetime={created_at} locale='en_short' />
          </a>
        </header>
        <p
          data-cy='text'
          className='mb-3'
          dangerouslySetInnerHTML={{ __html: html ?? text }}
        />
        <div className='-m-1.5 flex items-stretch min-w-0 justify-between text-slate-500'>
          <Action
            color='blue'
            icon={<ReplyIcon />}
            href={`https://twitter.com/intent/tweet?in_reply_to=${id}`}
          />
          <Action
            color='green'
            icon={<RetweetIcon />}
            href={`https://twitter.com/intent/retweet?tweet_id=${id}`}
            count={retweet_count + quote_count}
          />
          <Action
            color='red'
            icon={<LikeIcon />}
            href={`https://twitter.com/intent/like?tweet_id=${id}`}
            count={like_count}
          />
          <Action
            color='blue'
            icon={<ShareIcon />}
            href={`https://twitter.com/${author.username}/status/${id}`}
          />
        </div>
      </article>
    </li>
  );
}
