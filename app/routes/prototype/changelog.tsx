import type { ReactNode } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';
import { useLoaderData } from '@remix-run/react';
import { useMemo } from 'react';

import type { LoaderData } from '~/prototype/changelog.server';

export { loader } from '~/prototype/changelog.server';

type PostLinkProps = { children?: ReactNode; href?: string };
function PostLink({ children, href }: PostLinkProps) {
  return (
    <a href={href} target='_blank' rel='noopener noreferrer'>
      {children}
    </a>
  );
}

function Post({ code, frontmatter, week }: LoaderData[0] & { week: number }) {
  const Component = useMemo(() => getMDXComponent(code), [code]);
  return (
    <section>
      <hr className='border-t border-gray-200 dark:border-gray-700' />
      <div className='my-20 flex items-start'>
        <header className='w-1/4 sticky top-6 mr-6 shrink-0'>
          <h4 className='text-gray-600 dark:text-gray-400 font-medium'>
            Week {week}
            <span className='mx-1.5 text-gray-500'>·</span>
            <span className='text-gray-500'>
              {new Date(frontmatter.date).toLocaleString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </h4>
          <a
            className='block text-gray-500'
            href={`https://twitter.com/${frontmatter.author}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            @{frontmatter.author}
          </a>
        </header>
        <article className='-mt-8 prose prose-gray dark:prose-invert max-w-none prose-img:rounded-xl prose-headings:font-semibold prose-blockquote:font-normal prose-p:before:hidden prose-p:after:hidden prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-a:text-inherit prose-a:font-normal'>
          <Component components={{ a: PostLink }} />
        </article>
      </div>
    </section>
  );
}

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
              href='https://www.getrevue.co/profile/tweetscapehq'
              target='_blank'
              rel='noopener noreferrer'
            >
              Subscribe to Updates
            </a>
            <span className='mx-3'>·</span>
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
        {posts.map((post, idx) => (
          <Post
            code={post.code}
            frontmatter={post.frontmatter}
            key={post.frontmatter.date}
            week={posts.length - idx}
          />
        ))}
      </main>
    </div>
  );
}
