import { json, useLoaderData } from 'remix';
import type { LoaderFunction } from 'remix';
import invariant from 'tiny-invariant';

import type { Article } from '~/articles.server';
import { getArticles } from '~/articles.server';
import { topic } from '~/cookies.server';

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.topic, 'expected params.topic');
  const articles = await getArticles(params.topic);
  return json(articles, {
    headers: { 'Set-Cookie': await topic.serialize(params.topic) },
  });
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
          <li key={article.url} className='my-4'>
            <div className='ml-2'>
              <a
                className='font-serif font-semibold hover:underline text-base'
                href={article.url}
                target='_blank'
                rel='noopener noreferrer'
              >
                {article.title}
              </a>{' '}
              <span className='text-sm'>
                (
                <a
                  className='hover:underline'
                  href={`https://${article.domain}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {article.domain}
                </a>
                )
              </span>
            </div>
            <p className='text-sm ml-2'>{article.description}</p>
            <div className='text-sm text-stone-600 lowercase flex items-center mt-1.5 ml-2'>
              <span className='flex flex-row-reverse justify-end -ml-[2px] mr-0.5'>
                {article.tweets.map((tweet) => (
                  <a
                    className='inline-block cursor-pointer duration-75 hover:transition hover:border-0 hover:scale-125 hover:z-0 h-6 w-6 rounded-full bg-white border-2 border-stone-200 -mr-2 first:mr-0 overflow-hidden'
                    href={`https://twitter.com/${tweet.author.social_account.social_account.screen_name}/status/${tweet.id}`}
                    rel='noopener noreferrer'
                    target='_blank'
                    key={tweet.id}
                  >
                    <img
                      src={`/img/${encodeURIComponent(
                        tweet.author.social_account.social_account
                          .profile_image_url
                      )}`}
                      alt=''
                    />
                  </a>
                ))}
              </span>
              <a
                className='ml-1 hover:underline cursor-pointer'
                href={`https://twitter.com/search?q=${encodeURIComponent(
                  article.url
                )}`}
                rel='noopener noreferrer'
                target='_blank'
              >
                {article.tweets.length} insider
                {article.tweets.length > 1 && 's'} tweeted
              </a>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.date).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className='mx-1'>•</span>
              <span>
                {new Date(article.date).toLocaleString(undefined, {
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
