import type { ReactNode } from 'react';

import TwitterIcon from '~/icons/twitter';

export interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className='py-4 border-b-2 border-slate-900 dark:border-white whitespace-no-wrap flex justify-between items-end'>
      <h1 className='font-extrabold tracking-tighter text-4xl'>
        tweetscape.co
        <TwitterIcon className='inline-block w-8 h-8 ml-2.5' />
      </h1>
      {children}
    </header>
  );
}
