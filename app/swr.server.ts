import { createHash } from 'crypto';

import {
  ArticlesFilter,
  ArticlesSort,
  DEFAULT_TWEETS_LIMIT,
  TweetsFilter,
  TweetsSort,
} from '~/query';
import type { Prisma } from '~/db.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { redis } from '~/redis.server';

const STILL_GOOD_PREFIX = 'swr:stillgood';
const RESPONSE_PREFIX = 'swr:response';

let connectionPromise: Promise<void>;
if (!redis.isOpen) connectionPromise = redis.connect();

function keys(
  query: Prisma.Sql,
  uid?: bigint
): {
  stillGoodKey: string;
  responseKey: string;
} {
  const hash = createHash('sha256');
  hash.update(query.sql);
  hash.update(JSON.stringify(query.values));
  const key = hash.digest('hex');
  const stillGoodKey = `${STILL_GOOD_PREFIX}:${uid ? `${uid}:` : ''}${key}`;
  const responseKey = `${RESPONSE_PREFIX}:${uid ? `${uid}:` : ''}${key}`;
  return { stillGoodKey, responseKey };
}

function logQueryExecute(query: Prisma.Sql) {
  const msg = query.sql.replace(/\n/g, '').replace(/\s\s+/g, ' ').substr(0, 50);
  log.trace(`Executing PostgreSQL query ( ${msg.trim()} )...`);
}

export function cache<
  S extends TweetsSort | ArticlesSort,
  F extends TweetsFilter | ArticlesFilter
>(
  id: string,
  sorts: S,
  filters: F,
  getQuery: (
    id: string,
    sort: S,
    filter: F,
    limit: number,
    uid?: bigint
  ) => Prisma.Sql,
  revalidateOrInvalidate: (query: Prisma.Sql) => Promise<unknown>,
  limit: number = DEFAULT_TWEETS_LIMIT,
  uid?: bigint
) {
  log.debug(`Revalidating view (${id}) tweets...`);
  /* eslint-disable consistent-return */
  const promises = Object.values(sorts).map((sort: S) => {
    if (typeof sort === 'string') return;
    return Object.values(filters).map((filter: F) => {
      if (typeof filter === 'string') return;
      return revalidateOrInvalidate(getQuery(id, sort, filter, limit, uid));
    });
  });
  /* eslint-enable consistent-return */
  return Promise.all(promises.flat());
}

export async function invalidate(uid: bigint) {
  log.info(`Invalidating cache keys for user (${uid})...`);
  const scan = redis.scanIterator({
    TYPE: 'string',
    MATCH: `${RESPONSE_PREFIX}:${uid}:*`,
    COUNT: 100,
  });
  for await (const key of scan) {
    log.debug(`Unlinking cache key (${key})...`);
    await redis.unlink(key);
  }
}

export async function revalidate<T>(
  query: Prisma.Sql,
  uid?: bigint,
  maxAgeSeconds = 60
): Promise<T[]> {
  const { stillGoodKey, responseKey } = keys(query, uid);
  logQueryExecute(query);
  const toCache = await db.$queryRaw<T[]>(query);
  await redis.set(responseKey, JSON.stringify(toCache));
  await redis.setEx(stillGoodKey, maxAgeSeconds, 'true');
  return toCache;
}

export async function swr<T>(
  query: Prisma.Sql,
  uid?: bigint,
  maxAgeSeconds = 60
): Promise<T[]> {
  await connectionPromise;

  const { stillGoodKey, responseKey } = keys(query, uid);
  const cachedStillGoodPromise = redis
    .get(stillGoodKey)
    .then((cachedStillGood) => !!cachedStillGood)
    .catch(() => false);

  let response = await redis
    .get(responseKey)
    .then(async (cachedResponseString) => {
      if (!cachedResponseString) return null;

      const cachedResponse = JSON.parse(cachedResponseString) as T[];

      if (!cachedResponse.length) return null;

      if (await cachedStillGoodPromise) {
        log.trace(`Redis cache hit for (${responseKey}), returning...`);
      } else {
        log.debug(`Redis cache stale for (${responseKey}), revalidating...`);

        /* eslint-disable-next-line promise/no-nesting */
        (async () => {
          await revalidate(query, uid, maxAgeSeconds);
        })().catch((e) => {
          log.error(`Failed to revalidate: ${(e as Error).message}`);
        });
      }

      return cachedResponse;
    })
    .catch(() => null);

  if (!response) {
    log.debug(`Redis cache miss for (${responseKey}), querying...`);
    logQueryExecute(query);
    response = await db.$queryRaw<T[]>(query);

    (async () => {
      await redis.set(responseKey, JSON.stringify(response));
      await redis.setEx(stillGoodKey, maxAgeSeconds, 'true');
    })().catch((e) => {
      log.error(`Failed to seed cache: ${(e as Error).message}`);
    });
  }

  return response;
}
