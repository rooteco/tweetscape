import type { Dispatch, SetStateAction } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useFetcher, useLocation, useMatches } from 'remix';
import type { Fetcher } from '@remix-run/react/transition';

import BoltIcon from '~/icons/bolt';
import { ErrorContext } from '~/error';
import ErrorIcon from '~/icons/error';
import type { LoaderData } from '~/root';
import SyncIcon from '~/icons/sync';
import { TimeAgo } from '~/components/timeago';

function useSync(
  action: string,
  obj: string,
  setStatus: Dispatch<SetStateAction<string>>,
  prev?: Fetcher
) {
  const user = (useMatches()[0].data as LoaderData | undefined)?.user;
  const { error } = useContext(ErrorContext);
  const fetcher = useFetcher();
  useEffect(() => {
    if (error) return;
    if (user && fetcher.type === 'init' && (!prev || prev.type === 'done')) {
      fetcher.submit(null, { method: 'patch', action });
      setStatus(`Syncing ${obj}`);
    }
  }, [action, obj, setStatus, error, user, fetcher, prev]);
  return fetcher;
}

export default function Sync() {
  const { error } = useContext(ErrorContext);

  const [status, setStatus] = useState('Syncing user');
  const follows = useSync('/sync/follows', 'follows', setStatus);
  const lists = useSync('/sync/lists', 'lists', setStatus, follows);
  const tweets = useSync('/sync/tweets', 'tweets', setStatus, lists);
  const articles = useSync('/sync/articles', 'articles', setStatus, tweets);

  const [lastSynced, setLastSynced] = useState<Date>();
  useEffect(() => {
    if (articles.type === 'done') setLastSynced((prev) => prev ?? new Date());
  }, [articles.type]);

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
  if (articles.type !== 'done')
    return (
      <div className='cursor-wait mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'>
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
