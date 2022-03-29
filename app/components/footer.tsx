export default function Footer() {
  return (
    <footer className='py-4 mt-10 border-t-2 border-gray-900 dark:border-white whitespace-no-wrap flex justify-end items-end'>
      <p className='text-xs text-center md:text-right'>
        all content copyright{' '}
        <a
          className='underline'
          href='https://roote.co'
          target='_blank'
          rel='noopener noreferrer'
        >
          roote
        </a>{' '}
        © 2022 · all rights reserved
        <br />
        read more about{' '}
        <a
          className='underline'
          href='https://www.roote.co/tweetscape/vision'
          target='_blank'
          rel='noopener noreferrer'
        >
          our vision
        </a>{' '}
        and{' '}
        <a
          className='underline'
          href='https://github.com/rooteco/tweetscape#how-it-works'
          target='_blank'
          rel='noopener noreferrer'
        >
          how it works
        </a>{' '}
        ·{' '}
        <a
          className='underline'
          href='https://twitter.com/TweetscapeHQ'
          target='_blank'
          rel='noopener noreferrer'
        >
          twitter
        </a>
      </p>
    </footer>
  );
}
