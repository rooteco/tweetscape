import type { ReactNode } from 'react';
import cn from 'classnames';

export interface EmptyProps {
  children: ReactNode;
  className?: string;
}

export default function Empty({ children, className }: EmptyProps) {
  return (
    <div
      className={cn(
        'border rounded text-slate-400 border-slate-300 dark:text-slate-600 dark:border-slate-700 border-dashed text-center font-normal p-6 flex flex-col items-center justify-center',
        className
      )}
    >
      {children}
    </div>
  );
}
