import { useLoaderData } from 'remix';

import type { Influencer, Score, Tweet } from '~/db.server';
import type { LoaderData } from '~/routes/$cluster';

export type TweetItemProps = Tweet & {
  author: Influencer;
  score: Score;
  order: number;
};

export default function TweetItem({
  author,
  score,
  id,
  text,
  retweet_count,
  created_at,
  order,
}: TweetItemProps) {
  const { locale } = useLoaderData<LoaderData>();
  return (
    <li order={order} className='flex p-2 w-full sm:w-1/2'>
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
  );
}
