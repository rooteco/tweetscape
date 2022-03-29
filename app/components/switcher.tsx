import * as Portal from '@radix-ui/react-portal';
import {
  NavLink,
  useLocation,
  useMatches,
  useResolvedPath,
  useTransition,
} from 'remix';
import {
  animated,
  useTransition as useSpringTransition,
} from '@react-spring/web';
import cn from 'classnames';
import useMeasure from 'react-use-measure';
import { useState } from 'react';

import type { LoaderData } from '~/root';

function SectionLink({ to, children }: { to: string; children: string }) {
  const transition = useTransition();
  const path = useResolvedPath(to);
  return (
    <NavLink
      key={to}
      prefetch='intent'
      className={({ isActive }) =>
        cn('block px-2.5 py-1 my-0.5 rounded', {
          'bg-gray-100 dark:bg-gray-800': isActive,
          'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors':
            !isActive,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname,
        })
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}

type SectionProps = { header: string; links: { to: string; name: string }[] };
function Section({ header, links }: SectionProps) {
  return (
    <section className='text-xs first-of-type:mt-0.5 mt-2.5'>
      <h2 className='text-gray-500 px-2.5 font-semibold'>{header}</h2>
      {links.map(({ to, name }) => (
        <SectionLink key={to} to={to}>
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
  const [ref, { x, y, width, height }] = useMeasure();
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
    config: { mass: 1, tension: 750, friction: 35 },
  });
  return (
    <>
      <button
        ref={ref}
        className='cursor-pointer outline-none mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        type='button'
        onClick={() => setOpen((prev) => !prev)}
      >
        {pathname}
      </button>
      {transitions((styles, mounted) =>
        mounted ? (
          <Portal.Root>
            <animated.div
              style={{ ...styles, minWidth: width, y: y + height, x }}
              className='rounded-md origin-top-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 fixed z-30 shadow-xl p-2'
            >
              {!!clusters.length && (
                <Section
                  header='Hive clusters'
                  links={clusters.map((c) => ({
                    name: c.name,
                    to: `/clusters/${c.slug}`,
                  }))}
                />
              )}
              <Section
                header='Rekt parlors'
                links={[{ name: 'Crypto', to: '/rekt/crypto' }]}
              />
              {!!lists.length && (
                <Section
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
