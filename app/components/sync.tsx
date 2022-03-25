import { useContext, useEffect, useState } from 'react';
import { useFetcher, useLocation, useMatches } from 'remix';

import BoltIcon from '~/icons/bolt';
import { ErrorContext } from '~/error';
import ErrorIcon from '~/icons/error';
import type { LoaderData } from '~/root';
import SyncIcon from '~/icons/sync';
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
      setProgress(1 / 4);
      setStatus('Syncing lists');
    } else if (lists.type === 'done') setProgress(2 / 4);
  }, [error, user, lists]);
  const tweets = useFetcher();
  useEffect(() => {
    if (error) return;
    if (user && lists.type === 'done' && tweets.type === 'init') {
      tweets.submit(null, { method: 'patch', action: '/sync/tweets' });
      setProgress(3 / 4);
      setStatus('Syncing tweets');
    } else if (tweets.type === 'done') {
      setProgress(4 / 4);
      setLastSynced((prev) => prev ?? new Date());
    }
  }, [error, user, lists.type, tweets]);

  const location = useLocation();

  if (error)
    return (
      <a
        href={`${location.pathname}${location.search}`}
        className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
      >
        <ErrorIcon />
        <span>Sync error</span>
      </a>
    );
  if (progress < 1)
    return (
      <div className='cursor-wait inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'>
        <SyncIcon />
        <span>{status}</span>
      </div>
    );
  return (
    <a
      href={`${location.pathname}${location.search}`}
      className='inline-flex truncate items-center text-xs bg-slate-200 dark:bg-slate-700 rounded px-2 h-6'
    >
      <BoltIcon />
      <span>
        Synced <TimeAgo datetime={lastSynced ?? new Date()} locale='en_short' />
      </span>
    </a>
  );
}
