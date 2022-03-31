import type { InfluencerFull } from '~/types';
import OpenInNewIcon from '~/icons/open-in-new';
import VerifiedIcon from '~/icons/verified';
import { num } from '~/utils';

export default function Profile({
  name,
  username,
  verified,
  description,
  html,
  following_count,
  followers_count,
  profile_image_url,
}: InfluencerFull) {
  return (
    <article className='peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible peer-active:opacity-100 peer-active:visible active:opacity-100 active:visible shadow-xl invisible opacity-0 transition-[opacity,visibility] absolute top-7 left-2 z-10 hover:delay-500 peer-hover:delay-500 active:delay-500 peer-active:delay-500 duration-300 ease-in-out w-72 p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg'>
      <div className='absolute -top-2.5 left-0 right-0 h-2.5 transparent' />
      <header>
        <div className='flex justify-between items-start'>
          <a
            className='block w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'
            href={`https://twitter.com/${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            {profile_image_url && (
              <img width={64} height={64} src={profile_image_url} alt='' />
            )}
          </a>
          <a
            className='block py-2.5 px-5 rounded-full bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900 font-semibold'
            href={`https://twitter.com/intent/user?screen_name=${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            Follow
          </a>
        </div>
        <div className='mt-2 flex items-end'>
          <a
            className='block hover:underline leading-5 font-semibold text-base'
            href={`https://twitter.com/${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            {name}
          </a>
          {verified && (
            <span className='pl-0.5 block h-5'>
              <VerifiedIcon className='h-5 w-5 fill-sky-500 dark:fill-current' />
            </span>
          )}
        </div>
        <div className='mt-1 leading-none text-gray-500'>
          <a
            className='hover:underline'
            href={`https://twitter.com/${username}`}
            rel='noopener noreferrer'
            target='_blank'
          >
            @{username}
          </a>
          <span className='mx-1'>·</span>
          <a
            className='hover:underline'
            href={`https://hive.one/p/${username}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            hive
            <OpenInNewIcon className='inline fill-current w-3.5 h-3.5 ml-0.5' />
          </a>
          <span className='mx-1'>·</span>
          <a
            className='hover:underline'
            href={`https://feed.rekt.news/parlor/${username}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            rekt
            <OpenInNewIcon className='inline fill-current w-3.5 h-3.5 ml-0.5' />
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
          <span className='text-gray-500'> Following</span>
        </a>
        <a
          className='hover:underline mr-3'
          href={`https://twitter.com/${username}/followers`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <span className='font-semibold'>{num(followers_count ?? 0)}</span>
          <span className='text-gray-500'> Followers</span>
        </a>
      </p>
    </article>
  );
}
