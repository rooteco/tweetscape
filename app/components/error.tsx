import Empty from '~/prototype/components/empty';

export default function ErrorDisplay({ error }: { error: Error }) {
  return (
    <Empty className='flex-1 m-5'>
      <article className='max-w-md'>
        <p>An unexpected runtime error occurred:</p>
        <p>{error.message}</p>
        <p className='mt-2'>
          Try logging out and in again. Or smash your keyboard; that sometimes
          helps. If you still have trouble, come and complain in{' '}
          <a
            className='underline'
            href='https://discord.gg/3KYQBJwRSS'
            target='_blank'
            rel='noopener noreferrer'
          >
            our Discord server
          </a>
          ; we’re always more than happy to help.
        </p>
      </article>
    </Empty>
  );
}
