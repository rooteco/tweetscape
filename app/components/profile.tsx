import type { InfluencerFull } from '~/types';
import OpenInNewIcon from '~/icons/open-in-new';
import { num } from '~/utils';

export default function Profile({
  name,
  username,
  description,
  html,
  following_count,
  followers_count,
  profile_image_url,
}: InfluencerFull) {
  return (
    <article className='peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible peer-active:opacity-100 peer-active:visible active:opacity-100 active:visible shadow-xl invisible opacity-0 transition-[opacity,visibility] absolute top-7 left-10 z-10 hover:delay-500 peer-hover:delay-500 active:delay-500 peer-active:delay-500 duration-300 ease-in-out w-72 p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg'>
      <div className='absolute -top-2.5 left-0 right-0 h-2.5 transparent' />
      <header>
        <div className='flex justify-between items-start'>
          <a
            className='block w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'
            href={`https://twitter.com/${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            {profile_image_url && (
              <img
                src={`/img/${encodeURIComponent(
                  profile_image_url
                )}?width=64&height=64&fit=cover`}
                alt=''
              />
            )}
          </a>
          <a
            className='block py-2.5 px-5 rounded-full bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 font-semibold'
            href={`https://twitter.com/intent/user?screen_name=${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            Follow
          </a>
        </div>
        <a
          className='block hover:underline mt-2 leading-none font-semibold text-base'
          href={`https://twitter.com/${username}`}
          rel='noopener noreferrer'
          target='_blank'
        >
          {name}
        </a>
        <div className='mt-1 leading-none text-slate-500'>
          <a
            href={`https://twitter.com/${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            @{username}
          </a>
          <span className='mx-1'>·</span>
          <a
            href={`https://hive.one/p/${username}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            hive.one
            <OpenInNewIcon className='inline fill-current w-3.5 h-3.5 ml-0.5 mb-px' />
          </a>
        </div>
      </header>
      <p
        className='my-3'
        dangerouslySetInnerHTML={{
          __html: html ?? description ?? '',
        }}
      />
      <p>
        <a
          className='hover:underline mr-3'
          href={`https://twitter.com/${username}/following`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <span className='font-semibold'>{num(following_count ?? 0)}</span>
          <span className='text-slate-500'> Following</span>
        </a>
        <a
          className='hover:underline mr-3'
          href={`https://twitter.com/${username}/followers`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <span className='font-semibold'>{num(followers_count ?? 0)}</span>
          <span className='text-slate-500'> Followers</span>
        </a>
      </p>
    </article>
  );
}
