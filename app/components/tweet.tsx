import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useFetcher, useFetchers, useLocation, useNavigate } from 'remix';
import cn from 'classnames';

import type { Ref, TweetFull, UserFull } from '~/types';
import LikeIcon from '~/icons/like';
import LikedIcon from '~/icons/liked';
import type { LoaderData } from '~/root';
import Profile from '~/components/profile';
import ReplyIcon from '~/icons/reply';
import RetweetIcon from '~/icons/retweet';
import RetweetedIcon from '~/icons/retweeted';
import ShareIcon from '~/icons/share';
import { TimeAgo } from '~/components/timeago';
import VerifiedIcon from '~/icons/verified';
import { eq, num } from '~/utils';
import { useMatches } from '~/json';

type ActionProps = {
  active?: boolean;
  count?: number;
  color: string;
  icon: ReactNode;
  href: string;
  action?: string;
  activeIcon?: ReactNode;
  id?: string;
};

function Action({
  active,
  count,
  color,
  icon,
  href,
  action,
  activeIcon,
  id,
}: ActionProps) {
  const fetchers = useFetchers();
  const path = `/actions/${action}/${id}`;
  const fetching = fetchers.find((f) => f.submission?.action === path);
  const isActive = fetching ? fetching.submission?.method === 'POST' : !!active;
  const fetcher = useFetcher();
  const iconWrapperComponent = (
    <div
      className={cn('p-1.5 mr-0.5 rounded-full transition duration-[0.2s]', {
        'group-hover:bg-red-50 group-active:bg-red-50': color === 'red',
        'group-hover:bg-blue-50 group-active:bg-blue-50': color === 'blue',
        'group-hover:bg-green-50 group-active:bg-green-50': color === 'green',
      })}
    >
      {isActive ? activeIcon : icon}
    </div>
  );
  const className = cn(
    'disabled:cursor-wait inline-flex justify-start items-center transition duration-[0.2s] group',
    {
      'hover:text-red-550 active:text-red-550': color === 'red',
      'hover:text-blue-550 active:text-blue-550': color === 'blue',
      'hover:text-green-550 active:text-green-550': color === 'green',
      'text-red-550': color === 'red' && isActive,
      'text-blue-550': color === 'blue' && isActive,
      'text-green-550': color === 'green' && isActive,
    }
  );
  const root = useMatches()[0].data as LoaderData | undefined;
  const n = count !== undefined && count + (isActive ? 1 : 0);
  if (root?.user && action && id)
    return (
      <fetcher.Form
        className='grow shrink basis-0 mr-5 h-8'
        method={isActive ? 'delete' : 'post'}
        action={path}
      >
        <button type='submit' className={cn('w-full', className)}>
          {iconWrapperComponent}
          {!!n && num(n)}
        </button>
        <input
          type='hidden'
          name='action'
          value={isActive ? 'delete' : 'post'}
        />
      </fetcher.Form>
    );
  return (
    <a
      className={cn('grow shrink basis-0 mr-5 h-8', className)}
      href={href}
      rel='noopener noreferrer'
      target='_blank'
    >
      {iconWrapperComponent}
      {!!n && num(n)}
    </a>
  );
}

function getRefs(tweet?: TweetFull) {
  const refs = tweet?.ref_tweets
    ?.filter((t) => !!t)
    .map((t) => ({
      ...(t as TweetFull),
      type: (tweet.refs?.find((r) => eq(r?.referenced_tweet_id, t?.id)) as Ref)
        .type,
      author: tweet.ref_authors?.find((a) =>
        eq(a?.id, t?.author_id)
      ) as UserFull,
      liked: tweet.ref_likes?.some((r) => eq(r?.tweet_id, t?.id)),
      retweeted: tweet.ref_retweets?.some((r) => eq(r?.tweet_id, t?.id)),
    }));
  return refs;
}

type TweetProps = {
  tweet?: TweetFull;
  nested?: boolean;
  setActiveTweet?: Dispatch<SetStateAction<TweetFull | undefined>>;
};

function TweetInner({ tweet, nested, setActiveTweet }: TweetProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { pathname } = useLocation();
  const isQuote = tweet?.refs?.some((r) => r?.type === 'quoted');
  const refs = getRefs(tweet);
  return (
    <div
      role='button'
      tabIndex={-1}
      onClick={(evt) => {
        evt.stopPropagation();
        if (!tweet || pathname.includes(tweet.id.toString())) return;
        if (evt.target !== evt.currentTarget) {
          const validTargets = ['P', 'ARTICLE', 'HEADER'];
          if (!validTargets.includes((evt.target as Node).nodeName)) return;
        }
        if (setActiveTweet) setActiveTweet(tweet);
        fetcher.submit(null, { action: `/sync/${tweet.id}`, method: 'patch' });
        navigate(`${pathname}/${tweet.id}`);
      }}
      onKeyPress={() => {}}
      className={cn('flex w-full pl-3 pr-3 pb-3 relative', {})}
    >
      {!nested && (
        <a
          className={cn(
            'block flex-none mr-3 w-12 h-12 rounded-full bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden',
            { 'animate-pulse': !tweet }
          )}
          href={
            tweet?.author ? `https://twitter.com/${tweet.author.username}` : ''
          }
          rel='noopener noreferrer'
          target='_blank'
        >
          {tweet?.author?.profile_image_url && (
            <img
              width={48}
              height={48}
              src={tweet.author.profile_image_url}
              alt=''
            />
          )}
        </a>
      )}
      <article className='flex-1 min-w-0'>
        <header className='mb-0.5 flex items-end'>
          {nested && (
            <a
              className='block flex-none mr-1 w-5 h-5 rounded-full bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden'
              href={
                tweet?.author
                  ? `https://twitter.com/${tweet.author.username}`
                  : ''
              }
              rel='noopener noreferrer'
              target='_blank'
            >
              {tweet?.author?.profile_image_url && (
                <img
                  width={48}
                  height={48}
                  src={tweet.author.profile_image_url}
                  alt=''
                />
              )}
            </a>
          )}
          <a
            href={
              tweet?.author
                ? `https://twitter.com/${tweet.author.username}`
                : ''
            }
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'peer hover:underline block font-semibold min-w-0 shrink truncate',
              {
                'h-4 w-40 mt-1 mb-1.5 bg-gray-200/50 dark:bg-gray-700/50 animate-pulse rounded':
                  !tweet,
              }
            )}
          >
            {tweet?.author?.name}
          </a>
          {tweet?.author?.verified && (
            <span className='block peer pl-0.5 h-5'>
              <VerifiedIcon className='h-5 w-5 fill-sky-500 dark:fill-current' />
            </span>
          )}
          <span className='block peer pl-1 h-5' />
          <a
            data-cy='author'
            className={cn('peer text-gray-500 block flex-none', {
              'h-2.5 w-32 mb-1.5 ml-1.5 bg-gray-200/50 dark:bg-gray-700/50 animate-pulse rounded':
                !tweet,
            })}
            href={
              tweet?.author
                ? `https://twitter.com/${tweet.author.username}`
                : ''
            }
            target='_blank'
            rel='noopener noreferrer'
          >
            {tweet?.author ? `@${tweet.author.username}` : ''}
          </a>
          {tweet && (
            <span className='mx-1 text-gray-500 block flex-none'>·</span>
          )}
          <a
            data-cy='date'
            className='hover:underline text-gray-500 block flex-none'
            href={
              tweet?.author
                ? `https://twitter.com/${tweet.author.username}/status/${tweet.id}`
                : ''
            }
            target='_blank'
            rel='noopener noreferrer'
          >
            {tweet && <TimeAgo datetime={tweet.created_at} locale='en_short' />}
          </a>
          {tweet?.author && <Profile {...tweet.author} />}
        </header>
        <p
          data-cy='text'
          className={cn('mb-3', {
            'h-12 w-full bg-gray-200/50 dark:bg-gray-700/50 animate-pulse rounded':
              !tweet,
          })}
          dangerouslySetInnerHTML={{ __html: tweet?.html ?? tweet?.text ?? '' }}
        />
        {isQuote &&
          refs
            ?.filter((r) => r.type === 'quoted')
            .map((t) => (
              <TweetItem
                nested
                tweet={t}
                setActiveTweet={setActiveTweet}
                key={t.id.toString()}
              />
            ))}
        <div className='-m-1.5 flex items-stretch min-w-0 justify-between text-gray-500'>
          <Action
            color='blue'
            icon={<ReplyIcon />}
            href={`https://twitter.com/intent/tweet?in_reply_to=${tweet?.id}`}
            count={tweet?.reply_count}
          />
          <Action
            color='green'
            icon={<RetweetIcon />}
            href={`https://twitter.com/intent/retweet?tweet_id=${tweet?.id}`}
            action='retweet'
            id={tweet?.id.toString()}
            count={tweet ? tweet.retweet_count + tweet.quote_count : undefined}
            active={tweet?.retweeted}
            activeIcon={<RetweetedIcon />}
          />
          <Action
            color='red'
            icon={<LikeIcon />}
            href={`https://twitter.com/intent/like?tweet_id=${tweet?.id}`}
            action='like'
            id={tweet?.id.toString()}
            count={tweet?.like_count}
            active={tweet?.liked}
            activeIcon={<LikedIcon />}
          />
          <Action
            color='blue'
            icon={<ShareIcon />}
            href={`https://twitter.com/${tweet?.author?.username}/status/${tweet?.id}`}
          />
        </div>
      </article>
    </div>
  );
}

export default function TweetItem({
  tweet,
  nested,
  setActiveTweet,
}: TweetProps) {
  const refs = getRefs(tweet);
  const isRetweet = tweet?.refs?.some((r) => r?.type === 'retweeted');
  return (
    <li
      className={cn(
        'w-full list-none text-sm border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/10 transition-colors',
        {
          'mb-3 border rounded-lg': nested,
          'border-b last-of-type:border-0': !nested,
          'pt-3': !isRetweet || nested,
          'pt-2': isRetweet,
        }
      )}
    >
      {isRetweet && (
        <header className='text-gray-500 text-xs px-3 mb-0.5'>
          <svg viewBox='0 0 24 24' className='ml-8 w-4 h-4 fill-current inline'>
            <g>
              <path d='M23.615 15.477c-.47-.47-1.23-.47-1.697 0l-1.326 1.326V7.4c0-2.178-1.772-3.95-3.95-3.95h-5.2c-.663 0-1.2.538-1.2 1.2s.537 1.2 1.2 1.2h5.2c.854 0 1.55.695 1.55 1.55v9.403l-1.326-1.326c-.47-.47-1.23-.47-1.697 0s-.47 1.23 0 1.697l3.374 3.375c.234.233.542.35.85.35s.613-.116.848-.35l3.375-3.376c.467-.47.467-1.23-.002-1.697zM12.562 18.5h-5.2c-.854 0-1.55-.695-1.55-1.55V7.547l1.326 1.326c.234.235.542.352.848.352s.614-.117.85-.352c.468-.47.468-1.23 0-1.697L5.46 3.8c-.47-.468-1.23-.468-1.697 0L.388 7.177c-.47.47-.47 1.23 0 1.697s1.23.47 1.697 0L3.41 7.547v9.403c0 2.178 1.773 3.95 3.95 3.95h5.2c.664 0 1.2-.538 1.2-1.2s-.535-1.2-1.198-1.2z' />
            </g>
          </svg>
          <a
            className='ml-3 font-bold hover:underline'
            href={`https://twitter.com/${tweet?.author?.username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            {tweet?.author?.name} Retweeted
          </a>
          <a
            className='ml-1 font-bold hover:underline'
            href={`https://twitter.com/${tweet?.author?.username}/status/${tweet?.id}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            <TimeAgo
              datetime={tweet?.created_at ?? new Date()}
              locale='en_short'
            />
          </a>
        </header>
      )}
      {isRetweet &&
        refs
          ?.filter((r) => r.type === 'retweeted')
          .map((t) => (
            <TweetInner
              tweet={t}
              setActiveTweet={setActiveTweet}
              key={t.id.toString()}
              nested={nested}
            />
          ))}
      {!isRetweet && (
        <TweetInner
          tweet={tweet}
          setActiveTweet={setActiveTweet}
          nested={nested}
        />
      )}
    </li>
  );
}
