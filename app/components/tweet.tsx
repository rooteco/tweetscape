import type { CSSProperties, ReactNode } from 'react';
import {
  useFetcher,
  useFetchers,
  useLocation,
  useMatches,
  useNavigate,
} from '@remix-run/react';
import cn from 'classnames';

import { canUseDOM, num } from '~/utils';
import LikeIcon from '~/icons/like';
import LikedIcon from '~/icons/liked';
import type { LoaderData } from '~/root';
import Profile from '~/components/profile';
import ReplyIcon from '~/icons/reply';
import RetweetIcon from '~/icons/retweet';
import RetweetedIcon from '~/icons/retweeted';
import ShareIcon from '~/icons/share';
import { TimeAgo } from '~/components/timeago';
import type { TweetJS } from '~/types';
import VerifiedIcon from '~/icons/verified';

export const ITEM_WIDTH = 574;
export const FALLBACK_ITEM_HEIGHT = 132;

const BORDER = 1;
const AVATAR_WIDTH = 48;
const AVATAR_MARGIN_RIGHT = 12;
const ITEM_PADDING = 12;
const TEXT_WIDTH =
  ITEM_WIDTH - 2 * ITEM_PADDING - AVATAR_WIDTH - AVATAR_MARGIN_RIGHT;
const QUOTE_TEXT_WIDTH = TEXT_WIDTH - 2 * ITEM_PADDING - 2 * BORDER;
const TEXT_LINE_HEIGHT = 20;
const TEXT_FONT_SIZE = 14;
const TEXT_MARGIN_BOTTOM = 12;
const ACTIONS_HEIGHT = 32;
const ACTIONS_MARGIN = -6;
const HEADER_HEIGHT = 20;
const HEADER_MARGIN_BOTTOM = 2;
const RETWEET_HEADER_HEIGHT = 16;
const RETWEET_HEADER_MARGIN_BOTTOM = 2;
const RETWEET_PADDING_TOP = 8;

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. 'bold 14px verdana').
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextHeight(text: string, contentWidth = TEXT_WIDTH): number {
  if (!canUseDOM) return 0;
  let div = document.getElementById('measure');
  if (!div) {
    div = document.createElement('div');
    div.id = 'measure';
    div.style.visibility = 'hidden';
    div.style.display = 'inline-block';
    div.style.fontSize = `${TEXT_FONT_SIZE}px`;
    div.style.lineHeight = `${TEXT_LINE_HEIGHT}px`;
    div.style.fontFamily = 'Inter';
    document.body.appendChild(div);
  }
  div.style.width = `${contentWidth}px`;
  div.textContent = text;
  return div.clientHeight;
}

export function getTweetItemHeight(
  tweet?: TweetJS,
  contentWidth = TEXT_WIDTH
): number {
  if (!tweet) return FALLBACK_ITEM_HEIGHT;
  const text = tweet.retweets.length ? tweet.retweets[0].text : tweet.text;
  let height = getTextHeight(text, contentWidth) + TEXT_MARGIN_BOTTOM;
  height += ACTIONS_HEIGHT + 2 * ACTIONS_MARGIN;
  height += HEADER_HEIGHT + HEADER_MARGIN_BOTTOM;
  height += ITEM_PADDING;
  height += tweet.retweets.length ? RETWEET_PADDING_TOP : ITEM_PADDING;
  tweet.retweets.forEach(() => {
    height += RETWEET_HEADER_HEIGHT + RETWEET_HEADER_MARGIN_BOTTOM;
  });
  tweet.quotes.forEach((quote) => {
    height += getTweetItemHeight(quote, QUOTE_TEXT_WIDTH);
    height += BORDER + TEXT_MARGIN_BOTTOM;
  });
  return height + BORDER;
}

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

type TweetProps = { tweet?: TweetJS; nested?: boolean };

function TweetInner({ tweet, nested }: TweetProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { pathname, search } = useLocation();
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
        fetcher.submit(null, { action: `/sync/${tweet.id}`, method: 'patch' });
        navigate(`${pathname}/${tweet.id}${search}`);
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
          dangerouslySetInnerHTML={{ __html: tweet?.html ?? '' }}
        />
        {!!tweet?.quotes?.length &&
          tweet.quotes.map((t) => <TweetItem nested tweet={t} key={t.id} />)}
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
            id={tweet?.id}
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
  style,
}: TweetProps & { style?: CSSProperties }) {
  return (
    <li
      style={style}
      className={cn(
        'w-full list-none text-sm border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/10 transition-colors',
        {
          'mb-3 border rounded-lg': nested,
          'border-b last-of-type:border-0': !nested,
          'pt-3': !tweet?.retweets.length || nested,
          'pt-2': !!tweet?.retweets.length,
        }
      )}
    >
      {!!tweet?.retweets.length && (
        <header className='text-gray-500 text-xs px-3 mb-0.5'>
          <svg
            viewBox='0 0 24 24'
            className='ml-8 w-4 h-4 fill-gray-500 inline'
          >
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
      {!!tweet?.retweets.length &&
        tweet.retweets.map((t) => (
          <TweetInner tweet={t} key={t.id} nested={nested} />
        ))}
      {!tweet?.retweets.length && <TweetInner tweet={tweet} nested={nested} />}
    </li>
  );
}
