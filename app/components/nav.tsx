import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import cn from 'classnames';

export type NavProps = {
  scrollerRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
  header: string;
};

export default function Nav({ header, children, scrollerRef }: NavProps) {
  const [visible, setVisible] = useState<boolean>(true);
  const lastScrollPosition = useRef<number>(0);

  useEffect(() => {
    if (!scrollerRef.current) return () => {};
    const scroller = scrollerRef.current;
    function handleScroll(): void {
      const currentScrollPosition = scroller.scrollTop;
      const prevScrollPosition = lastScrollPosition.current;
      lastScrollPosition.current = currentScrollPosition;
      setVisible(() => {
        const scrolledUp = currentScrollPosition < prevScrollPosition;
        const scrolledToTop = currentScrollPosition < 10;
        return scrolledUp || scrolledToTop;
      });
    }
    scroller.addEventListener('scroll', handleScroll);
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, [scrollerRef]);

  return (
    <nav
      className={cn(
        'z-30 text-xs p-3 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-[opacity,top]',
        {
          'opacity-0 -top-5 pointer-events-none': !visible,
          'opacity-1 top-0': visible,
        }
      )}
    >
      <div className='flex items-stretch'>
        <h2 className='flex-none text-sm font-semibold mr-4 lg:block hidden'>
          {header}
        </h2>
        <div className='flex-1 flex flex-wrap items-center lg:ml-0 ml-10'>
          {children}
        </div>
      </div>
    </nav>
  );
}
