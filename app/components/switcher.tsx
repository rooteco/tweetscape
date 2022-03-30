import * as Portal from '@radix-ui/react-portal';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  NavLink,
  useLocation,
  useResolvedPath,
  useSearchParams,
  useTransition,
} from 'remix';
import {
  animated,
  config,
  useSpring,
  useTransition as useSpringTransition,
} from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import { ResizeObserver as polyfill } from '@juggle/resize-observer';
import useMeasure from 'react-use-measure';
import useOnClickOutside from 'react-cool-onclickoutside';

type SectionLinkProps = {
  to: string;
  name: string;
};
function SectionLink({
  to,
  name,
  setHoverY,
}: SectionLinkProps & {
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
}) {
  const [searchParams] = useSearchParams();
  let matches = true;
  if (to.includes('?')) {
    const [path, query] = to.split('?');
    const params = new URLSearchParams(query);
    matches = [...params.entries()].every(
      ([k, v]) => searchParams.get(k) === v
    );
    [...searchParams.entries()].forEach(([k, v]) => {
      if (!params.has(k)) params.set(k, v);
    });
    to = `${path}?${params.toString()}`;
  }
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
      className={({ isActive }) =>
        cn('block mx-2 px-2 py-1 my-0.5 rounded whitespace-nowrap', {
          'bg-gray-200 dark:bg-gray-700': isActive && matches,
          'cursor-wait':
            transition.state === 'loading' &&
            transition.location.pathname === path.pathname &&
            transition.location.search === path.search,
        })
      }
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
  setHoverY,
}: SectionProps & {
  setHoverY: Dispatch<SetStateAction<number | undefined>>;
}) {
  return (
    <section className='text-xs first-of-type:-mt-2.5 my-2.5'>
      <h2 className='text-gray-500 py-1 px-4 bg-gray-100 dark:bg-gray-800 my-2.5'>
        {header}
      </h2>
      {links.map(({ to, name }) => (
        <SectionLink key={to} to={to} name={name} setHoverY={setHoverY} />
      ))}
    </section>
  );
}

export type SwitcherProps = { sections: SectionProps[]; icon?: ReactNode };
export default function Switcher({ sections, icon }: SwitcherProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const active =
    sections
      .map((s) => s.links)
      .flat()
      .find((l) => {
        const [path, query] = l.to.split('?');
        let matches = true;
        if (query) {
          const params = new URLSearchParams(query);
          matches = [...params.entries()].every(
            ([k, v]) => searchParams.get(k) === v
          );
        }
        return pathname.includes(path) && matches;
      })?.name ?? 'Not Found';
  const [open, setOpen] = useState(false);
  const portalRef = useOnClickOutside(() => setOpen(false));
  const [ref, { x, y, width, height }] = useMeasure({ polyfill });
  useEffect(() => {
    console.log('Measure:', { x, y, width, height });
  }, [x, y, width, height]);
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
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'cursor-pointer outline-none mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6',
          { 'ignore-onclickoutside': open }
        )}
      >
        {icon}
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
