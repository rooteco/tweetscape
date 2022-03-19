import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

// TODO: Export an enum instead of this.
export type Theme = 'sync' | 'dark' | 'light';
export const THEMES: Theme[] = ['sync', 'dark', 'light'];
export const THEME_SNIPPET = `
  if (localStorage.theme === 'dark')
    document.documentElement.classList.add('dark');
  if (!localStorage.theme || localStorage.theme === 'sync') {
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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'sync') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
    }
  }, [theme]);
  useEffect(() => {
    setTheme((prev) => (localStorage.getItem('theme') as Theme) ?? prev);
  }, []);
  useEffect(() => {
    if (theme) localStorage.setItem('theme', theme);
  }, [theme]);
  return useMemo(() => [theme, setTheme], [theme, setTheme]);
}
