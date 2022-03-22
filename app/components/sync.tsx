import { useContext, useEffect, useState } from 'react';
import { useFetcher, useLocation, useMatches } from 'remix';

import { ErrorContext } from '~/error';
import type { LoaderData } from '~/root';
import { TimeAgo } from '~/components/timeago';

export default function Sync() {
  const user = (useMatches()[0].data as LoaderData | undefined)?.user;
  const { error } = useContext(ErrorContext);

  const [lastSynced, setLastSynced] = useState<Date>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Syncing user');
  const lists = useFetcher();
  useEffect(() => {
    if (error) return;
    if (user && lists.type === 'init') {
      lists.submit(null, { method: 'patch', action: '/sync/lists' });
      setProgress(1 / 6);
      setStatus('Syncing lists');
    } else if (lists.type === 'done') setProgress(2 / 6);
  }, [error, user, lists]);
  const tweets = useFetcher();
  useEffect(() => {
    if (error) return;
    if (user && lists.type === 'done' && tweets.type === 'init') {
      tweets.submit(null, { method: 'patch', action: '/sync/tweets' });
      setProgress(3 / 6);
      setStatus('Syncing tweets');
    } else if (tweets.type === 'done') setProgress(4 / 6);
  }, [error, user, lists.type, tweets]);
  const articles = useFetcher();
  useEffect(() => {
    if (error) return;
    if (user && tweets.type === 'done' && articles.type === 'init') {
      articles.submit(null, { method: 'patch', action: '/sync/articles' });
      setProgress(5 / 6);
      setStatus('Syncing articles');
    } else if (articles.type === 'done') {
      setProgress(6 / 6);
      setLastSynced((prev) => prev ?? new Date());
    }
  }, [error, user, tweets.type, articles]);

  const location = useLocation();

  if (error)
    return (
      <a
        href={`${location.pathname}${location.search}`}
        className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'
      >
        <svg
          className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
          xmlns='http://www.w3.org/2000/svg'
          height='24'
          viewBox='0 0 24 24'
          width='24'
        >
          <path d='M0 0h24v24H0z' fill='none' />
          <path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' />
        </svg>
        <span>Sync error</span>
      </a>
    );
  if (progress < 1)
    return (
      <div className='cursor-wait inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'>
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500 animate-rotate'
        >
          <path d='M11.6678 12.7487C10.6537 13.5332 9.38135 14 8 14C4.68629 14 2 11.3137 2 8C2 6.61865 2.4668 5.34632 3.25127 4.33216L1.82842 2.90931C0.686208 4.29247 0 6.0661 0 8C0 12.4183 3.58172 16 8 16C9.9339 16 11.7075 15.3138 13.0907 14.1716L11.6678 12.7487Z' />
          <path d='M5.32045 2.6301C6.12695 2.22688 7.03698 2 8 2C11.3137 2 14 4.68629 14 8C14 8.96302 13.7731 9.87305 13.3699 10.6796L14.8406 12.1503C15.5763 10.9403 16 9.51961 16 8C16 3.58172 12.4183 0 8 0C6.48039 0 5.05974 0.423692 3.84973 1.15939L5.32045 2.6301Z' />
        </svg>
        <span>{status}</span>
      </div>
    );
  return (
    <a
      href={`${location.pathname}${location.search}`}
      className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 dark:text-white rounded px-2 h-6'
    >
      <svg
        className='shrink-0 w-3.5 h-3.5 mr-1 fill-slate-500'
        xmlns='http://www.w3.org/2000/svg'
        height='24'
        viewBox='0 0 24 24'
        width='24'
      >
        <path d='M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z' />
      </svg>
      <span>
        Synced <TimeAgo datetime={lastSynced ?? new Date()} locale='en_short' />
      </span>
    </a>
  );
}
