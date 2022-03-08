import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';
import { useLoaderData } from 'remix';

import type { Article } from '~/db.server';
import { log } from '~/utils.server';
import { pool } from '~/db.server';

export const loader: LoaderFunction = async ({ params }) => {
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
  return data.rows as Article[];
};

export default function Index() {
  const articles = useLoaderData<Article[]>();
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
                  `${article.expanded_url
                    .replace(/^https?:\/\/(www\.)?/, '')
                    .substr(0, 50)}…`}
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
            <p className='text-sm ml-2'>
              {article.description ||
                'No appropriate description meta tag found in article html; perhaps they did something weird like put their tag names in all caps 🤷.'}
            </p>
            <div className='text-sm text-stone-600 flex items-center mt-1.5 ml-2'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
                {article.tweets.map(
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
                {new Date(article.tweets[0].created_at).toLocaleString(
                  undefined,
                  {
                    month: 'short',
                    day: 'numeric',
                  }
                )}
              </span>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.tweets[0].created_at).toLocaleString(
                  undefined,
                  {
                    hour: 'numeric',
                    minute: 'numeric',
                  }
                )}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
