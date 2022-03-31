import { useLoaderData } from 'remix';

import type { LoaderData } from '~/changelog.server';

export { loader } from '~/changelog.server';

export default function Changelog() {
  const posts = useLoaderData<LoaderData>();
  return (
    <div className='max-w-screen-xl mx-auto px-6'>
      <header className='flex relative'>
        <div className='w-1/4 min-w-[160px] mr-6' />
        <div className='py-14'>
          <h1 className='mb-5 text-5xl font-bold tracking-tight'>Changelog</h1>
          <p className='mb-2.5 text-gray-600 dark:text-gray-400'>
            New updates and improvements to Tweetscape.
          </p>
          <p className='text-gray-600 dark:text-gray-400'>
            <a
              className='dark:text-sky-400 text-sky-500'
              href='https://discord.gg/3KYQBJwRSS'
              target='_blank'
              rel='noopener noreferrer'
            >
              Join the community
            </a>
            <span className='mx-3'>·</span>
            <a
              className='dark:text-sky-400 text-sky-500'
              href='https://twitter.com/TweetscapeHQ'
              target='_blank'
              rel='noopener noreferrer'
            >
              Follow us on Twitter
            </a>
          </p>
        </div>
      </header>
      <main className='my-8 relative'>
        {posts.map((post) => (
          <section key={post.id}>
            <hr className='border-t border-gray-200 dark:border-gray-700' />
            <div className='my-20 flex items-start'>
              <h4 className='w-1/4 sticky top-6 mr-6 shrink-0 text-gray-600 dark:text-gray-400 font-medium'>
                {new Date(post.date).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h4>
              <article
                className='-mt-8 prose prose-gray dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-semibold prose-blockquote:font-normal prose-p:before:hidden prose-p:after:hidden prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-a:text-inherit prose-a:font-normal'
                key={post.id}
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
