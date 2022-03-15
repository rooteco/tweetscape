import type { ReactNode } from 'react';

export interface EmptyProps {
  children: ReactNode;
}

export default function Empty({ children }: EmptyProps) {
  return (
    <div className='border uppercase rounded text-slate-400 border-slate-300 dark:text-slate-600 dark:border-slate-700 border-dashed text-center font-normal p-6 my-12 flex flex-col items-center justify-center min-h-[95vh]'>
      {children}
    </div>
  );
}
