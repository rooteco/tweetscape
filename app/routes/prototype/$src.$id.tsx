import { animated, useSpring } from '@react-spring/web';
import { useEffect, useRef } from 'react';
import { Outlet } from '@remix-run/react';
import useMeasure from 'react-use-measure';

import ErrorDisplay from '~/prototype/components/error';
import Header from '~/prototype/components/header';
import { useError } from '~/prototype/error';

export function ErrorBoundary({ error }: { error: Error }) {
  useError(error);
  return (
    <main className='flex flex-col fixed inset-0 overflow-hidden'>
      <Header />
      <ErrorDisplay error={error} />
    </main>
  );
}

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mainRef, { width: vw }] = useMeasure();
  const [measureRef, { width, height }] = useMeasure();
  const centered = vw / 2 + (width - 2 * vw) / 2;
  const righted = width - 2 * vw;
  const mountRun = useRef(true);
  useEffect(() => {
    if (mountRun.current && vw && width) mountRun.current = false;
  }, [vw, width]);
  useSpring({
    left: righted > centered ? righted : centered,
    behavior: 'instant',
    immediate: mountRun.current,
    onChange: ({ value }) => scrollRef.current?.scroll(value),
  });
  return (
    <main ref={mainRef} className='flex flex-col fixed inset-0 overflow-hidden'>
      <Header />
      <animated.div
        id='scroller'
        ref={scrollRef}
        className='flex-1 overflow-y-hidden overflow-x-auto'
      >
        <div ref={measureRef} className='inline-flex h-full'>
          <div className='flex-none w-screen' />
          <Outlet context={height} />
          <div className='flex-none w-screen' />
        </div>
      </animated.div>
    </main>
  );
}
