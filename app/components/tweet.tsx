import { useLoaderData } from 'remix';

import type { Influencer, Score, Tweet } from '~/db.server';
import LikeIcon from '~/icons/like';
import type { LoaderData } from '~/routes/$cluster';
import ReplyIcon from '~/icons/reply';
import TwitterIcon from '~/icons/twitter';

export type TweetItemProps = Tweet & {
  author: Influencer;
  score: Score;
};

export default function TweetItem({
  author,
  score,
  id,
  text,
  html,
  retweet_count,
  created_at,
}: TweetItemProps) {
  const { locale } = useLoaderData<LoaderData>();
  return (
    <li className='flex p-2 w-full sm:w-1/2'>
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
              className='ml-2 inline-flex justify-center items-center'
              href={`https://twitter.com/${author.username}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              <TwitterIcon />
            </a>
            <a
              className='ml-2 inline-flex justify-center items-center'
              href={`https://twitter.com/intent/like?tweet_id=${id}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              <LikeIcon />
            </a>
            <a
              className='mx-2 inline-flex justify-center items-center'
              href={`https://twitter.com/intent/tweet?in_reply_to=${id}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              <ReplyIcon />
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
        <p
          className='mt-3 text-xs text-justify'
          dangerouslySetInnerHTML={{ __html: html ?? text }}
        />
      </div>
    </li>
  );
}
