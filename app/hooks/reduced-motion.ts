import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: no-preference)';
const isRenderingOnServer = typeof window === 'undefined';

// For our initial server render, we won't know if the user
// prefers reduced motion, but it doesn't matter. This value
// will be overwritten on the client, before any animations
// occur.
const getInitialState = () =>
  isRenderingOnServer ? true : !window.matchMedia(QUERY).matches;

// @see https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(getInitialState);
  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(!event.matches);
    };
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      mediaQueryList.addListener(listener);
    }
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        mediaQueryList.removeListener(listener);
      }
    };
  }, []);
  return prefersReducedMotion;
}
