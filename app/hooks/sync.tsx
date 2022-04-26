import {
  useActionData,
  useFetcher,
  useFetchers,
  useResolvedPath,
} from '@remix-run/react';
import { useContext, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';

import type { APIError } from '~/twitter.server';
import BoltIcon from '~/icons/bolt';
import { ErrorContext } from '~/error';
import ErrorIcon from '~/icons/error';
import SyncIcon from '~/icons/sync';
import { TimeAgo } from '~/components/timeago';

export default function useSync(action?: string, obj = '', shouldSync = true) {
  const { error } = useContext(ErrorContext);
  const { pathname } = useResolvedPath('');
  const data = useActionData<APIError>();
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
  const reloading = useMemo(
    () =>
      fetchers.some(
        (f) =>
          f.type === 'actionReload' &&
          f.submission.action === (action ?? pathname)
      ),
    [fetchers, action, pathname]
  );
  const [lastSynced, setLastSynced] = useState<Date>();
  useEffect(() => {
    setLastSynced(undefined);
  }, [pathname, action]);
  useEffect(() => {
    if (!syncing) setLastSynced(new Date());
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
          {error && !syncing && !reloading && (
            <>
              <ErrorIcon />
              <span>Sync error</span>
            </>
          )}
          {data?.msg && !syncing && !reloading && (
            <>
              <ErrorIcon />
              {data.reset && <TimeAgo datetime={data.reset} />}
              {!data.reset && <span>{data.msg}</span>}
            </>
          )}
          {syncing && (
            <>
              <SyncIcon />
              <span>Syncing{obj ? ` ${obj}` : ''}</span>
            </>
          )}
          {!syncing && reloading && (
            <>
              <SyncIcon />
              <span>Reloading{obj ? ` ${obj}` : ''}</span>
            </>
          )}
          {!error && !syncing && !reloading && (
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
    [
      syncing,
      reloading,
      data,
      lastSynced,
      obj,
      error,
      action,
      fetcher,
      pathname,
    ]
  );
  return { syncing, indicator };
}
