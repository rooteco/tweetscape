import { useCallback, useEffect, useRef } from 'react';

import { random } from '~/prototype/utils';

// Utility helper for random number generation
// @see https://www.joshwcomeau.com/snippets/react-hooks/use-random-interval/
export function useRandomInterval(
  callback: () => void,
  minDelay?: number,
  maxDelay?: number
) {
  const timeoutId = useRef<ReturnType<typeof setTimeout>>();
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    const isEnabled =
      typeof minDelay === 'number' && typeof maxDelay === 'number';
    if (isEnabled) {
      const handleTick = () => {
        const nextTickAt = random(minDelay, maxDelay);
        timeoutId.current = setTimeout(() => {
          savedCallback.current();
          handleTick();
        }, nextTickAt);
      };
      handleTick();
    }
    return () => timeoutId.current && clearTimeout(timeoutId.current);
  }, [minDelay, maxDelay]);
  const cancel = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
  }, []);
  return cancel;
}
