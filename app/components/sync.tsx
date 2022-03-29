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

  const location = useLocation();

  if (error)
    return (
      <a
        href={`${location.pathname}${location.search}`}
        className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
      >
        <ErrorIcon />
        <span>Sync error</span>
      </a>
    );
  if (progress < 1)
    return (
      <div className='mr-1.5 cursor-wait flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'>
        <SyncIcon />
        <span>{status}</span>
      </div>
    );
  return (
    <a
      href={`${location.pathname}${location.search}`}
      className='mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'
    >
      <BoltIcon />
      <span>
        Synced <TimeAgo datetime={lastSynced ?? new Date()} locale='en_short' />
      </span>
    </a>
  );
}
