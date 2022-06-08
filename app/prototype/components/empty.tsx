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
        'border rounded text-sm text-gray-400 border-gray-300 dark:text-gray-600 dark:border-gray-700 border-dashed text-center font-normal p-6 flex flex-col items-center justify-center',
        className
      )}
    >
      {children}
    </div>
  );
}
