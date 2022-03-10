import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { useLoaderData } from 'remix';

import { lang, log } from '~/utils.server';
import type { Article } from '~/db.server';
import { pool } from '~/db.server';

type LoaderData = { articles: Article[]; locale: string };

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<LoaderData> => {
  invariant(params.cluster, 'expected params.cluster');
  log.info(`Fetching articles for ${params.cluster}...`);
  const data = await pool.query(
    `
      select * from articles 
      where cluster_slug = '${params.cluster}'
      and expanded_url !~ '^https?:\\/\\/twitter\\.com' 
      order by attention_score desc
      limit 20;
      `
  );
  log.trace(`Articles: ${JSON.stringify(data, null, 2)}`);
  log.info(`Fetched ${data.rows.length} articles for ${params.cluster}.`);
  return { articles: data.rows as Article[], locale: lang(request) };
};

function substr(str: string, len: number): string {
  return `${str.substr(0, len).trim()}${str.length > len ? '…' : ''}`;
}

export default function Cluster() {
  const { articles, locale } = useLoaderData<LoaderData>();
  return (
    <main>
      <ol className='list-decimal text-sm ml-6 mr-4'>
        {!articles.length && (
          <div className='font-serif -ml-2 border rounded text-stone-600 border-stone-400 border-dashed text-lg text-center p-6 my-12 flex items-center justify-center min-h-[85vh]'>
            no articles to show
          </div>
        )}
        {articles.map((article) => (
          <li key={article.id} className='my-4'>
            <div className='ml-2'>
              <a
                className='font-serif font-semibold hover:underline text-base'
                href={article.expanded_url}
                target='_blank'
                rel='noopener noreferrer'
              >
                {article.title ||
                  substr(
                    article.expanded_url.replace(/^https?:\/\/(www\.)?/, ''),
                    50
                  )}
              </a>{' '}
              <span className='text-sm'>
                (
                <a
                  className='hover:underline'
                  href={`https://${new URL(
                    article.expanded_url
                  ).hostname.replace(/^www\./, '')}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {new URL(article.expanded_url).hostname.replace(/^www\./, '')}
                </a>
                )
              </span>
            </div>
            {article.description && (
              <p className='text-sm ml-2'>{substr(article.description, 375)}</p>
            )}
            <div className='text-sm text-stone-600 flex items-center mt-1.5 ml-2'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
                {article.tweets.slice(0, 25).map(
                  (tweet) =>
                    tweet.author && (
                      <a
                        className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-white border-2 border-white -mr-2 first:mr-0 overflow-hidden'
                        href={`https://twitter.com/${tweet.author.username}/status/${tweet.id}`}
                        rel='noopener noreferrer'
                        target='_blank'
                        key={tweet.id}
                      >
                        <img
                          src={`/img/${encodeURIComponent(
                            tweet.author.profile_image_url
                          )}`}
                          alt=''
                        />
                      </a>
                    )
                )}
              </span>
              <a
                className='ml-1 hover:underline cursor-pointer'
                href={`https://twitter.com/search?q=${encodeURIComponent(
                  article.expanded_url
                )}`}
                rel='noopener noreferrer'
                target='_blank'
              >
                {article.tweets.length} tweet
                {article.tweets.length > 1 && 's'}
              </a>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.tweets[0].created_at).toLocaleString(locale, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.tweets[0].created_at).toLocaleString(locale, {
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
