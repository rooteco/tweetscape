import type { Dispatch, SetStateAction } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { memo, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'remix';

import type { Article } from '~/types';
import { TimeAgo } from '~/components/timeago';
import { substr } from '~/utils';

export function ArticleContent({ article }: { article: Article }) {
  const earliestTweet = useMemo(
    () =>
      Array.from(article.tweets).sort(
        (a, b) =>
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
      )[0],
    [article.tweets]
  );
  return (
    <>
      <div className='flex items-center'>
        <a
          data-cy='title'
          className='hover:underline font-semibold text-base truncate'
          href={article.unwound_url ?? article.url}
          target='_blank'
          rel='noopener noreferrer'
        >
          {article.title ||
            (article.unwound_url ?? article.url).replace(
              /^https?:\/\/(www\.)?/,
              ''
            )}
        </a>
        <span className='ml-1 text-sm text-gray-500 block flex-none'>
          (
          <a
            data-cy='domain'
            className='hover:underline'
            href={`https://${new URL(
              article.unwound_url ?? article.url
            ).hostname.replace(/^www\./, '')}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {new URL(article.unwound_url ?? article.url).hostname.replace(
              /^www\./,
              ''
            )}
          </a>
          )
        </span>
      </div>
      {article.description && (
        <p data-cy='description' className='text-sm'>
          {substr(article.description, 235)}
        </p>
      )}
      <div className='text-sm text-gray-500 flex items-center mt-1.5'>
        <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
          {Array.from(article.tweets)
            .sort((a, b) =>
              b.score && a.score
                ? Number(b.score.attention_score) -
                  Number(a.score.attention_score)
                : 0
            )
            .slice(0, 10)
            .reverse()
            .map(({ id, author }) => (
              <a
                className='inline-block cursor-pointer duration-75 transition-transform hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 -mr-2 first:mr-0 overflow-hidden'
                href={`https://twitter.com/${author?.username}/status/${id}`}
                rel='noopener noreferrer'
                target='_blank'
                key={id}
              >
                <img
                  width={25}
                  height={25}
                  src={author?.profile_image_url ?? '/pics/placeholder.png'}
                  alt=''
                />
              </a>
            ))}
        </span>
        <span className='ml-1'>
          {article.tweets.length} tweet
          {article.tweets.length > 1 && 's'}
        </span>
        <span className='mx-1'>·</span>
        {article.attention_score && (
          <>
            <a
              href='https://borgcollective.notion.site/FAQ-5434e4695d60456cb481acb98bb88b18'
              target='_blank'
              rel='noopener noreferrer'
            >
              {Math.round(article.attention_score)} points
            </a>
            <span className='mx-1'>·</span>
          </>
        )}
        <a
          href={`https://twitter.com/${earliestTweet.author?.username}/status/${earliestTweet.id}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <TimeAgo datetime={earliestTweet.created_at} locale='en_short' />
        </a>
      </div>
    </>
  );
}

export type ArticleItemProps = {
  article: Article;
  setHover: Dispatch<SetStateAction<{ y: number; height: number } | undefined>>;
  setArticle: Dispatch<SetStateAction<Article>>;
};
function ArticleItem({ article, setHover, setArticle }: ArticleItemProps) {
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const onHoverIn = () => {
    setHovering(true);
    setHover((prev) =>
      ref.current
        ? { y: ref.current.offsetTop, height: ref.current.offsetHeight }
        : prev
    );
  };
  const onHoverOut = () => {
    setHovering(false);
    setHover(undefined);
  };
  const { pathname } = useLocation();
  const isActive = pathname.includes(encodeURIComponent(article.url));
  const navigate = useNavigate();
  const content = useMemo(
    () => <ArticleContent article={article} />,
    [article]
  );
  const styles = useSpring({
    blur: hovering || pathname.endsWith('articles') || isActive ? 0 : 2,
    opacity: hovering || pathname.endsWith('articles') || isActive ? 1 : 0.5,
  });
  return (
    <animated.button
      style={{
        opacity: styles.opacity,
        filter: styles.blur.to((blur) => `blur(${blur}px)`),
      }}
      type='button'
      ref={ref}
      onFocus={onHoverIn}
      onBlur={onHoverOut}
      onMouseOver={onHoverIn}
      onMouseOut={onHoverOut}
      className='relative p-3 text-left my-3 first-of-type:mt-0 last-of-type:mb-0 w-full rounded-lg cursor-pointer block'
      onClick={() => {
        setArticle(article);
        navigate(encodeURIComponent(article.url));
      }}
    >
      {content}
    </animated.button>
  );
}
export default memo(ArticleItem);
