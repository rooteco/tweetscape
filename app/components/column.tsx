import { Outlet, useResolvedPath } from 'remix';
import type { ReactNode, Ref } from 'react';
import { animated, useTransition } from '@react-spring/web';
import cn from 'classnames';
import { forwardRef } from 'react';

type ColumnProps<T> = {
  id?: string;
  context?: T;
  className?: string;
  children: ReactNode;
};
function Column<T>(
  { id, context, className, children }: ColumnProps<T>,
  ref?: Ref<HTMLElement>
) {
  const transitions = useTransition(<>{children}</>, {
    key: useResolvedPath('').pathname,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  });
  return (
    <>
      {transitions((styles, item, t, key) => (
        <animated.section
          style={styles}
          ref={ref}
          key={key}
          id={id}
          className={cn(
            'first-of-type:ml-auto last-of-type:mr-auto flex-none flex flex-col overflow-y-scroll',
            className
          )}
        >
          {item}
        </animated.section>
      ))}
      <Outlet context={context} />
    </>
  );
}

export default forwardRef(Column);
