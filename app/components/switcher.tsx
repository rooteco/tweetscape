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
  config,
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
  setActive: Dispatch<SetStateAction<string>>;
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
};
function SectionLink({ to, children, setActive, setHoverY }: SectionLinkProps) {
  const transition = useTransition();
  const path = useResolvedPath(to);
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <NavLink
      key={to}
      ref={ref}
      prefetch='intent'
      onMouseOver={() => setHoverY((prev) => ref.current?.offsetTop ?? prev)}
      onMouseOut={() => setHoverY(undefined)}
      className={({ isActive }) => {
        if (isActive) setActive(children);
        return cn('block mx-2 px-2 py-1 my-0.5 rounded whitespace-nowrap', {
          'bg-gray-200 dark:bg-gray-700': isActive,
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
  setActive: Dispatch<SetStateAction<string>>;
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
};
function Section({ header, links, setActive, setHoverY }: SectionProps) {
  return (
    <section className='text-xs first-of-type:-mt-2.5 my-2.5'>
      <h2 className='text-gray-500 py-1 px-4 bg-gray-100 dark:bg-gray-800 my-2.5'>
        {header}
      </h2>
      {links.map(({ to, name }) => (
        <SectionLink
          key={to}
          to={to}
          setActive={setActive}
          setHoverY={setHoverY}
        >
          {name}
        </SectionLink>
      ))}
    </section>
  );
}

export default function Switcher() {
  const { pathname } = useLocation();
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = (root?.clusters ?? []).map((c) => ({
    name: c.name,
    to: `/clusters/${c.slug}/${pathname.split('/').slice(3).join('/')}`,
  }));
  const lists = (root?.lists ?? []).map((l) => ({
    name: l.name,
    to: `/lists/${l.id}/${pathname.split('/').slice(3).join('/')}`,
  }));
  const rekt = [{ name: 'Crypto', to: '/rekt/crypto' }];
  const [active, setActive] = useState(
    () =>
      [...clusters, ...lists, ...rekt].find((l) => pathname.includes(l.to))
        ?.name ?? 'Not Found'
  );
  const [open, setOpen] = useState(false);
  const portalRef = useOnClickOutside(() => setOpen(false));
  const [ref, { x, y, width, height }] = useMeasure();
  const transitions = useSpringTransition(open, {
    from: {
      opacity: 0,
      scale: 0.95,
    },
    enter: {
      opacity: 1,
      scale: 1,
    },
    leave: {
      opacity: 0,
      scale: 0.95,
    },
    config: config.stiff,
  });
  const [hoverY, setHoverY] = useState<number>();
  const hoverStyles = useSpring({
    y: hoverY,
    opacity: hoverY !== undefined ? 1 : 0,
  });

  return (
    <>
      <button
        ref={ref}
        className='ignore-onclickoutside cursor-pointer outline-none mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
        type='button'
        onClick={() => setOpen((prev) => !prev)}
      >
        {active}
      </button>
      {transitions((styles, mounted) =>
        mounted ? (
          <Portal.Root ref={portalRef}>
            <animated.div
              style={{
                ...styles,
                minWidth: width,
                maxHeight: `calc(100vh - ${y}px - ${height}px - 64px)`,
                y: y + height,
                x,
              }}
              className='rounded-md origin-top-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 fixed z-30 shadow-xl relative overflow-y-auto overflow-x-hidden'
            >
              <animated.div
                style={hoverStyles}
                className='absolute inset-x-2 h-6 rounded bg-gray-100 dark:bg-gray-800 -z-[1]'
              />
              {!!clusters?.length && (
                <Section
                  setActive={setActive}
                  setHoverY={setHoverY}
                  header='Hive clusters'
                  links={clusters}
                />
              )}
              <Section
                setActive={setActive}
                setHoverY={setHoverY}
                header='Rekt parlors'
                links={rekt}
              />
              {!!lists?.length && (
                <Section
                  setActive={setActive}
                  setHoverY={setHoverY}
                  header='Your lists'
                  links={lists}
                />
              )}
            </animated.div>
          </Portal.Root>
        ) : null
      )}
    </>
  );
}
