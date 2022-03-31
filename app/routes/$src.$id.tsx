import { animated, useSpring } from '@react-spring/web';
import type { LoaderFunction } from 'remix';
import { Outlet } from 'remix';
import useMeasure from 'react-use-measure';
import { useRef } from 'react';

import Empty from '~/components/empty';
import Nav from '~/components/nav';
import { lang } from '~/utils.server';
import { useError } from '~/error';

export type LoaderData = { locale: string };

export const loader: LoaderFunction = ({ request }): LoaderData => ({
  locale: lang(request),
});

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <>
      <Nav />
      <main className='w-full h-full min-h-full fixed inset-0 overflow-hidden flex items-stretch'>
        <Empty className='flex-1 m-5'>
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
        </Empty>
      </main>
    </>
  );
}

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mainRef, { width: vw }] = useMeasure();
  const [measureRef, { width }] = useMeasure();
  const centered = vw / 2 + (width - 2 * vw) / 2;
  const righted = width - 2 * vw;
  useSpring({
    left: righted > centered ? righted : centered,
    behavior: 'instant',
    onChange: ({ value }) => scrollRef.current?.scroll(value),
  });
  return (
    <main ref={mainRef} className='flex flex-col fixed inset-0 overflow-hidden'>
      <Nav />
      <animated.div
        id='scroller'
        ref={scrollRef}
        className='flex-1 overflow-y-hidden overflow-x-auto'
      >
        <div ref={measureRef} className='inline-flex h-full'>
          <div className='flex-none w-screen' />
          <Outlet />
          <div className='flex-none w-screen' />
        </div>
      </animated.div>
    </main>
  );
}
