import type { ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className='relative group'>
      {children}
      <div className='absolute transition-all group-hover:delay-300 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 -translate-y-1 shadow-2xl opacity-0 delay-75 duration-100 invisible top-6 dark:bg-slate-900 bg-white rounded border border-slate-200 dark:border-white p-2.5 w-max max-w-xs'>
        {content}
      </div>
    </span>
  );
}
