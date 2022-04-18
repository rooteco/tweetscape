import type { ReactNode, Ref } from 'react';
import { Outlet } from '@remix-run/react';
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
  return (
    <>
      <section
        ref={ref}
        id={id}
        className={cn('flex-none flex flex-col overflow-y-scroll', className)}
      >
        {children}
      </section>
      <Outlet context={context} />
    </>
  );
}

export default forwardRef(Column);
