import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher, useFetchers, useResolvedPath } from '@remix-run/react';
import cn from 'classnames';

import BoltIcon from '~/icons/bolt';
import { ErrorContext } from '~/error';
import ErrorIcon from '~/icons/error';
import SyncIcon from '~/icons/sync';
import { TimeAgo } from '~/components/timeago';

export default function useSync(action?: string, obj = '', shouldSync = true) {
  const { error } = useContext(ErrorContext);
  const { pathname } = useResolvedPath('');
  const fetchers = useFetchers();
  const syncing = useMemo(
    () =>
      fetchers.some(
        (f) =>
          f.type === 'actionSubmission' &&
          f.submission.action === (action ?? pathname)
      ),
    [fetchers, action, pathname]
  );
  const prevSyncing = useRef(syncing);
  const [lastSynced, setLastSynced] = useState<Date>();
  useEffect(() => {
    setLastSynced(undefined);
  }, [pathname, action]);
  useEffect(() => {
    if (!syncing && prevSyncing.current)
      setLastSynced((prev) => prev ?? new Date());
    prevSyncing.current = syncing;
  }, [syncing]);
  const fetcher = useFetcher();
  useEffect(() => {
    if (!syncing && !lastSynced && !error && shouldSync)
      fetcher.submit(null, { method: 'patch', action: action ?? pathname });
  }, [fetcher, syncing, lastSynced, action, pathname, error, shouldSync]);
  const indicator = useMemo(
    () => (
      <fetcher.Form action={syncing ? '' : action ?? pathname} method='patch'>
        <button
          type='submit'
          className={cn(
            'mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6',
            { 'cursor-wait': syncing }
          )}
        >
          {error && !syncing && (
            <>
              <ErrorIcon />
              <span>Sync error</span>
            </>
          )}
          {syncing && (
            <>
              <SyncIcon />
              <span>Syncing{obj ? ` ${obj}` : ''}</span>
            </>
          )}
          {!error && !syncing && (
            <>
              <BoltIcon />
              <span>
                Synced{obj ? ` ${obj} ` : ' '}
                <TimeAgo
                  datetime={lastSynced ?? new Date()}
                  locale='en_short'
                />
              </span>
            </>
          )}
        </button>
      </fetcher.Form>
    ),
    [syncing, lastSynced, obj, error, action, fetcher, pathname]
  );
  return { syncing, indicator };
}
