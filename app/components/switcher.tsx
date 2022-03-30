import * as Portal from '@radix-ui/react-portal';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
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
  name: string;
};
function SectionLink({
  to,
  name,
  setActive,
  setHoverY,
}: SectionLinkProps & {
  setActive: Dispatch<SetStateAction<string>>;
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
}) {
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
        if (isActive) setActive(name);
        return cn('block mx-2 px-2 py-1 my-0.5 rounded whitespace-nowrap', {
          'bg-gray-200 dark:bg-gray-700': isActive,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname,
        });
      }}
      to={to}
    >
      {name}
    </NavLink>
  );
}

type SectionProps = {
  header: string;
  links: SectionLinkProps[];
};
function Section({
  header,
  links,
  setActive,
  setHoverY,
}: SectionProps & {
  setActive: Dispatch<SetStateAction<string>>;
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
}) {
  return (
    <section className='text-xs first-of-type:-mt-2.5 my-2.5'>
      <h2 className='text-gray-500 py-1 px-4 bg-gray-100 dark:bg-gray-800 my-2.5'>
        {header}
      </h2>
      {links.map(({ to, name }) => (
        <SectionLink
          key={to}
          to={to}
          name={name}
          setActive={setActive}
          setHoverY={setHoverY}
        />
      ))}
    </section>
  );
}

type SwitcherProps = { sections: SectionProps[]; children?: ReactNode };
function Switcher({ sections, children }: SwitcherProps) {
  const { pathname } = useLocation();
  const [active, setActive] = useState(
    () =>
      sections
        .map((s) => s.links)
        .flat()
        .find((l) => pathname.includes(l.to))?.name ?? 'Not Found'
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
        {children}
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
              {sections
                .filter((s) => s.links.length)
                .map(({ header, links }) => (
                  <Section
                    key={header}
                    header={header}
                    links={links}
                    setActive={setActive}
                    setHoverY={setHoverY}
                  />
                ))}
            </animated.div>
          </Portal.Root>
        ) : null
      )}
    </>
  );
}

export default function PageSwitcher() {
  const { pathname } = useLocation();
  const root = useMatches()[0].data as LoaderData | undefined;
  const type = pathname.split('/')[3] ?? 'articles';
  const clusters = (root?.clusters ?? []).map((c) => ({
    name: c.name,
    to: `/clusters/${c.slug}/${type}`,
  }));
  const lists = (root?.lists ?? []).map((l) => ({
    name: l.name,
    to: `/lists/${l.id}/${type}`,
  }));
  const rekt = [{ name: 'Crypto', to: `/rekt/crypto/${type}` }];
  return (
    <Switcher
      sections={[
        { header: 'Hive clusters', links: clusters },
        { header: 'Rekt parlors', links: rekt },
        { header: 'Your lists', links: lists },
      ]}
    />
  );
}
