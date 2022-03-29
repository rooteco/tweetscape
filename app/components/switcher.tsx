import * as Portal from '@radix-ui/react-portal';
import type { Dispatch, SetStateAction } from 'react';
import {
  NavLink,
  useLocation,
  useMatches,
  useResolvedPath,
  useTransition,
} from 'remix';
import {
  animated,
  useSpring,
  useTransition as useSpringTransition,
} from '@react-spring/web';
import { useRef, useState } from 'react';
import cn from 'classnames';
import useMeasure from 'react-use-measure';
import useOnClickOutside from 'react-cool-onclickoutside';

import type { LoaderData } from '~/root';

type SectionLinkProps = {
  to: string;
  children: string;
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
};
function SectionLink({ to, children, setHoverY }: SectionLinkProps) {
  const transition = useTransition();
  const path = useResolvedPath(to);
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <NavLink
      key={to}
      ref={ref}
      prefetch='intent'
      onMouseOver={() => setHoverY((prev) => ref.current?.offsetTop ?? prev)}
      className={({ isActive }) => {
        if (isActive) setHoverY((prev) => prev ?? ref.current?.offsetTop);
        return cn('block px-2.5 py-1 my-0.5 rounded', {
          'font-semibold text-sky-500 dark:text-sky-400': isActive,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname,
        });
      }}
      to={to}
    >
      {children}
    </NavLink>
  );
}

type SectionProps = {
  header: string;
  links: { to: string; name: string }[];
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
};
function Section({ header, links, setHoverY }: SectionProps) {
  return (
    <section className='text-xs first-of-type:mt-0.5 mt-2.5'>
      <h2 className='text-gray-500 px-2.5 font-semibold'>{header}</h2>
      {links.map(({ to, name }) => (
        <SectionLink key={to} to={to} setHoverY={setHoverY}>
          {name}
        </SectionLink>
      ))}
    </section>
  );
}

export default function Switcher() {
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = root?.clusters ?? [];
  const lists = root?.lists ?? [];
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const portalRef = useOnClickOutside(() => setOpen(false));
  const [ref, { x, y, width, height }] = useMeasure();
  const config = { mass: 1, tension: 750, friction: 35 };
  const transitions = useSpringTransition(open, {
    from: {
      opacity: 0,
      scale: 0.9,
    },
    enter: {
      opacity: 1,
      scale: 1,
    },
    leave: {
      opacity: 0,
      scale: 0.9,
    },
    config,
  });
  const [hoverY, setHoverY] = useState<number>();
  const hoverStyles = useSpring({ y: (hoverY ?? 28) - 7, config });
  return (
    <>
      <button
        ref={ref}
        className='ignore-onclickoutside cursor-pointer outline-none mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        type='button'
        onClick={() => setOpen((prev) => !prev)}
      >
        {pathname}
      </button>
      {transitions((styles, mounted) =>
        mounted ? (
          <Portal.Root ref={portalRef}>
            <animated.div
              style={{ ...styles, minWidth: width, y: y + height, x }}
              className='rounded-md origin-top-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 fixed z-30 shadow-xl p-2 relative'
            >
              <animated.div
                style={hoverStyles}
                className='absolute inset-x-1.5 h-6 rounded bg-gray-100 dark:bg-gray-800 -z-[1]'
              />
              {!!clusters.length && (
                <Section
                  setHoverY={setHoverY}
                  header='Hive clusters'
                  links={clusters.map((c) => ({
                    name: c.name,
                    to: `/clusters/${c.slug}`,
                  }))}
                />
              )}
              <Section
                setHoverY={setHoverY}
                header='Rekt parlors'
                links={[{ name: 'Crypto', to: '/rekt/crypto' }]}
              />
              {!!lists.length && (
                <Section
                  setHoverY={setHoverY}
                  header='Your lists'
                  links={lists.map((l) => ({
                    name: l.name,
                    to: `/lists/${l.id}`,
                  }))}
                />
              )}
            </animated.div>
          </Portal.Root>
        ) : null
      )}
    </>
  );
}
