import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher, useFetchers, useLocation } from 'remix';
import cn from 'classnames';

import BoltIcon from '~/icons/bolt';
import SyncIcon from '~/icons/sync';
import { TimeAgo } from '~/components/timeago';

export function useSyncing(action?: string) {
  const { pathname } = useLocation();
  const fetchers = useFetchers();
  const syncing = useMemo(
    () => fetchers.some((f) => f.submission?.action === (action ?? pathname)),
    [fetchers, action, pathname]
  );
  return syncing;
}

export default function SyncIndicator({ action }: { action?: string }) {
  const { pathname } = useLocation();
  const fetcher = useFetcher();
  useEffect(() => {
    if (fetcher.type === 'init')
      fetcher.submit(null, { action: action ?? pathname, method: 'patch' });
  }, [fetcher, action, pathname]);
  const syncing = useSyncing(action);
  const prevSyncing = useRef(syncing);
  const [lastSynced, setLastSynced] = useState<Date>();
  useEffect(() => {
    if (!syncing && prevSyncing.current)
      setLastSynced((prev) => prev ?? new Date());
    prevSyncing.current = syncing;
  }, [syncing]);
  return (
    <div
      className={cn(
        'mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6',
        { 'cursor-wait': syncing, 'cursor-default': !syncing }
      )}
    >
      {syncing && (
        <>
          <SyncIcon />
          <span>Syncing</span>
        </>
      )}
      {!syncing && (
        <>
          <BoltIcon />
          <span>
            Synced{' '}
            <TimeAgo datetime={lastSynced ?? new Date()} locale='en_short' />
          </span>
        </>
      )}
    </div>
  );
}
