import { useEffect } from 'react';
import { useFetcher } from '@remix-run/react';

import { Theme, Themed, isTheme, useTheme } from '~/prototype/theme';
import DarkIcon from '~/prototype/icons/dark';
import LightIcon from '~/prototype/icons/light';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const fetcher = useFetcher();
  useEffect(() => {
    if (fetcher.submission)
      setTheme((prev) => {
        const themeValue = fetcher.submission.formData.get('theme');
        return isTheme(themeValue) ? themeValue : prev;
      });
  }, [fetcher.submission, setTheme]);
  return (
    <fetcher.Form
      className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
      action='/actions/theme'
      method='post'
    >
      <button type='submit' className='flex truncate items-center'>
        <Themed
          dark={
            <DarkIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          }
          light={
            <LightIcon className='shrink-0 w-3.5 h-3.5 mr-1 fill-gray-500' />
          }
        />
        <Themed dark={<span>Dark Mode</span>} light={<span>Light Mode</span>} />
      </button>
      <input
        type='hidden'
        name='theme'
        value={theme === Theme.Light ? Theme.Dark : Theme.Light}
      />
    </fetcher.Form>
  );
}
