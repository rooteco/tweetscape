import { Link, json, useLoaderData, useSearchParams } from 'remix';
import type { LoaderFunction } from 'remix';
import cn from 'classnames';
import invariant from 'tiny-invariant';
import { useRef } from 'react';

import type { Article, TweetFull } from '~/types';
import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_ARTICLES_FILTER,
  DEFAULT_ARTICLES_SORT,
  DEFAULT_TWEETS_FILTER,
  DEFAULT_TWEETS_SORT,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import { commitSession, getSession } from '~/session.server';
import {
  getClusterArticles,
  getClusterTweets,
  getListArticles,
  getListTweets,
} from '~/query.server';
import { lang, log } from '~/utils.server';
import ArticleItem from '~/components/article';
import Empty from '~/components/empty';
import FilterIcon from '~/icons/filter';
import Nav from '~/components/nav';
import SortIcon from '~/icons/sort';
import TweetItem from '~/components/tweet';
import { useError } from '~/error';

export type LoaderData = {
  tweets: TweetFull[];
  articles: Article[];
  locale: string;
};

// $src - the type of source (e.g. clusters or lists).
// $id - the id of a specific source (e.g. a cluster slug or user list id).
export const loader: LoaderFunction = async ({ params, request }) => {
  invariant(params.src, 'expected params.src');
  invariant(params.id, 'expected params.id');
  log.info(`Fetching articles and tweets for ${params.src} (${params.id})...`);
  const url = new URL(request.url);
  const session = await getSession(request.headers.get('Cookie'));
  session.set('href', `${url.pathname}${url.search}`);
  const articlesSort = Number(
    url.searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    url.searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const tweetsSort = Number(
    url.searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    url.searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;
  const articles =
    params.src === 'clusters'
      ? await getClusterArticles(params.id, articlesSort, articlesFilter)
      : await getListArticles(params.id, articlesSort, articlesFilter);
  const tweets =
    params.src === 'clusters'
      ? await getClusterTweets(params.id, tweetsSort, tweetsFilter)
      : await getListTweets(params.id, tweetsSort, tweetsFilter);
  return json<LoaderData>(
    { articles, tweets, locale: lang(request) },
    { headers: { 'Set-Cookie': await commitSession(session) } }
  );
};

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  const tweetsRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);
  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={tweetsRef}
        className='flex-1 flex flex-col max-w-xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={tweetsRef} />
      </section>
      <section
        ref={articlesRef}
        className='flex-1 flex flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef} />
        <Empty className='flex-1 m-5'>
          <p className='uppercase'>an unexpected runtime error occurred</p>
          <p>{error.message}</p>
        </Empty>
      </section>
    </main>
  );
}

export default function Cluster() {
  const { articles, tweets } = useLoaderData<LoaderData>();
  const tweetsRef = useRef<HTMLElement>(null);
  const articlesRef = useRef<HTMLElement>(null);

  const [searchParams] = useSearchParams();
  const articlesSort = Number(
    searchParams.get('a') ?? DEFAULT_ARTICLES_SORT
  ) as ArticlesSort;
  const articlesFilter = Number(
    searchParams.get('b') ?? DEFAULT_ARTICLES_FILTER
  ) as ArticlesFilter;
  const tweetsSort = Number(
    searchParams.get('c') ?? DEFAULT_TWEETS_SORT
  ) as TweetsSort;
  const tweetsFilter = Number(
    searchParams.get('d') ?? DEFAULT_TWEETS_FILTER
  ) as TweetsFilter;

  return (
    <main className='flex flex-1 overflow-hidden'>
      <section
        ref={tweetsRef}
        className='flex-1 flex flex-col max-w-xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={tweetsRef}>
          <div className='flex items-stretch'>
            <h2 className='flex-none text-sm font-semibold mr-3'>Tweets</h2>
            <div className='flex-1 flex flex-wrap items-center'>
              <div className='flex-none mr-4'>
                <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.TweetCount,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.TweetCount}&d=${tweetsFilter}`}
                >
                  tweets
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.RetweetCount,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.RetweetCount}&d=${tweetsFilter}`}
                >
                  retweets
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.QuoteCount,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.QuoteCount}&d=${tweetsFilter}`}
                >
                  quotes
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.LikeCount,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.LikeCount}&d=${tweetsFilter}`}
                >
                  likes
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.FollowerCount,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.FollowerCount}&d=${tweetsFilter}`}
                >
                  followers
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.Latest,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.Latest}&d=${tweetsFilter}`}
                >
                  latest
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsSort === TweetsSort.Earliest,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${TweetsSort.Earliest}&d=${tweetsFilter}`}
                >
                  earliest
                </Link>
              </div>
              <div className='flex-none'>
                <FilterIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
                <Link
                  className={cn({
                    underline: tweetsFilter === TweetsFilter.HideRetweets,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${tweetsSort}&d=${TweetsFilter.HideRetweets}`}
                >
                  hide retweets
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: tweetsFilter === TweetsFilter.ShowRetweets,
                  })}
                  to={`?a=${articlesSort}&b=${articlesFilter}&c=${tweetsSort}&d=${TweetsFilter.ShowRetweets}`}
                >
                  show retweets
                </Link>
              </div>
            </div>
          </div>
        </Nav>
        {!tweets.length && (
          <Empty className='flex-1 m-5'>NO TWEETS TO SHOW</Empty>
        )}
        {!!tweets.length && (
          <ol>
            {tweets.map((t) => (
              <TweetItem {...t} key={t.id} />
            ))}
          </ol>
        )}
      </section>
      <section
        ref={articlesRef}
        className='flex-1 flex flex-col max-w-2xl border-r border-slate-200 dark:border-slate-800 overflow-y-auto'
      >
        <Nav scrollerRef={articlesRef}>
          <div className='flex items-stretch'>
            <h2 className='flex-none text-sm font-semibold mr-3'>Articles</h2>
            <div className='flex-1 flex flex-wrap items-center'>
              <div className='flex-none mr-4'>
                <SortIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
                <Link
                  className={cn({
                    underline: articlesSort === ArticlesSort.AttentionScore,
                  })}
                  to={`?a=${ArticlesSort.AttentionScore}&b=${articlesFilter}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  attention score
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: articlesSort === ArticlesSort.TweetCount,
                  })}
                  to={`?a=${ArticlesSort.TweetCount}&b=${articlesFilter}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  tweets
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: articlesSort === ArticlesSort.Latest,
                  })}
                  to={`?a=${ArticlesSort.Latest}&b=${articlesFilter}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  latest
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: articlesSort === ArticlesSort.Earliest,
                  })}
                  to={`?a=${ArticlesSort.Earliest}&b=${articlesFilter}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  earliest
                </Link>
              </div>
              <div className='flex-none'>
                <FilterIcon className='fill-current h-4 w-4 mr-1.5 inline-block' />
                <Link
                  className={cn({
                    underline: articlesFilter === ArticlesFilter.HideRetweets,
                  })}
                  to={`?a=${articlesSort}&b=${ArticlesFilter.HideRetweets}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  hide retweets
                </Link>
                {' · '}
                <Link
                  className={cn({
                    underline: articlesFilter === ArticlesFilter.ShowRetweets,
                  })}
                  to={`?a=${articlesSort}&b=${ArticlesFilter.ShowRetweets}&c=${tweetsSort}&d=${tweetsFilter}`}
                >
                  show retweets
                </Link>
              </div>
            </div>
          </div>
        </Nav>
        {!articles.length && (
          <Empty className='flex-1 m-5'>NO ARTICLES TO SHOW</Empty>
        )}
        {!!articles.length && (
          <ol>
            {articles.map((a) => (
              <ArticleItem {...a} key={a.url} />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
