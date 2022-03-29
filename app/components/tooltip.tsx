import type { ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className='relative group'>
      {children}
      <div className='text-gray-500 text-xs absolute z-10 transition-all group-hover:delay-500 group-hover:visible group-hover:opacity-100 group-hover:trangray-y-0 -trangray-y-1 shadow-2xl opacity-0 delay-75 invisible top-6 left-0 dark:bg-gray-900 bg-white rounded border border-gray-200 dark:border-gray-700 p-2.5 w-max max-w-xs'>
        {content}
      </div>
    </span>
  );
}
