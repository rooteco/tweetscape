import type { Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useEffect } from 'react';

// TODO: If I ever start introducing more than one of these, I should just
// swallow the increased bundle size and use a library like Jotai or Recoil.
export const ErrorContext = createContext<{
  error?: Error;
  setError: Dispatch<SetStateAction<Error | undefined>>;
}>({
  error: undefined,
  setError: () => {},
});
export function useError(error: Error) {
  const { setError } = useContext(ErrorContext);
  useEffect(() => setError(error), [error, setError]);
}
