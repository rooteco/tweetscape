import { useLoaderData } from 'remix';

import type { LoaderData } from '~/changelog.server';

export { loader } from '~/changelog.server';

export default function Changelog() {
  const posts = useLoaderData<LoaderData>();
  return (
    <div className='max-w-screen-xl mx-auto'>
      <header className='flex relative'>
        <div className='w-1/4 min-w-[160px] mr-6' />
        <div className='py-14'>
          <h1 className='mb-5 text-5xl font-bold'>Changelog</h1>
          <p className='mb-2.5 text-slate-500'>
            New updates and improvements to Tweetscape.
          </p>
          <p>
            <a
              className='dark:text-sky-400 text-sky-500'
              href='https://discord.gg/3KYQBJwRSS'
              target='_blank'
              rel='noopener noreferrer'
            >
              Subscribe to updates
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
            <hr className='border-t border-slate-200 dark:border-slate-700' />
            <div className='my-20 flex items-start'>
              <h4 className='w-1/4 sticky top-6 mr-6 shrink-0 text-slate-500'>
                {new Date(post.date).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h4>
              <article
                className='prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-img:first-of-type:mt-0'
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
