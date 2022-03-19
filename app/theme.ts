import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

export enum Theme {
  System,
  Dark,
  Light,
}

export const THEME_SNIPPET = `
  if (localStorage.theme === '${Theme.Dark}')
    document.documentElement.classList.add('dark');
  if (localStorage.theme === undefined || localStorage.theme === '${Theme.System}') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) 
      document.documentElement.classList.add('dark');
  }
  `;

export function useTheme(): [
  Theme | undefined,
  Dispatch<SetStateAction<Theme | undefined>>
] {
  const [theme, setTheme] = useState<Theme>();
  useEffect(() => {
    if (theme === Theme.Dark) {
      document.documentElement.classList.add('dark');
    } else if (theme === Theme.Light) {
      document.documentElement.classList.remove('dark');
    } else if (theme === Theme.System) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
    }
  }, [theme]);
  useEffect(() => {
    setTheme((p) => (Number(localStorage.getItem('theme')) as Theme) ?? p);
  }, []);
  useEffect(() => {
    if (theme !== undefined) localStorage.setItem('theme', theme.toString());
  }, [theme]);
  return useMemo(() => [theme, setTheme], [theme, setTheme]);
}
