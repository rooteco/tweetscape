import type { ReactNode, RefObject } from 'react';
import { animated, config, useSpring } from '@react-spring/web';
import { useEffect, useRef, useState } from 'react';

export type HeaderProps = {
  scrollerRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
};

export default function Header({ children, scrollerRef }: HeaderProps) {
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

  const styles = useSpring({
    opacity: visible ? 1 : 0,
    top: visible ? 0 : -24,
    config: { ...config.stiff, clamp: true },
  });

  return (
    <animated.nav
      style={styles}
      className='sticky z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-1.5 flex items-stretch border-b border-gray-200 dark:border-gray-800'
    >
      {children}
    </animated.nav>
  );
}
