import { createHash } from 'crypto';

import type { Prisma } from '~/db.server';
import { db } from '~/db.server';
import { log } from '~/utils.server';
import { redis } from '~/redis.server';

let connectionPromise: Promise<void>;
if (!redis.isOpen) connectionPromise = redis.connect();

function keys(query: Prisma.Sql): {
  stillGoodKey: string;
  responseKey: string;
} {
  const hash = createHash('sha256');
  hash.update(query.sql);
  hash.update(JSON.stringify(query.values));
  const key = hash.digest('hex');
  const stillGoodKey = `swr:stillgood:${key}`;
  const responseKey = `swr:response:${key}`;
  return { stillGoodKey, responseKey };
}

function logQueryExecute(query: Prisma.Sql) {
  const msg = query.sql.replace(/\n/g, '').replace(/\s\s+/g, ' ').substr(0, 50);
  log.debug(`Executing PostgreSQL query ( ${msg.trim()} )...`);
}

export async function revalidate<T>(
  query: Prisma.Sql,
  maxAgeSeconds = 60
): Promise<T[]> {
  const { stillGoodKey, responseKey } = keys(query);
  logQueryExecute(query);
  const toCache = await db.$queryRaw<T[]>(query);
  await redis.set(responseKey, JSON.stringify(toCache));
  await redis.setEx(stillGoodKey, maxAgeSeconds, 'true');
  return toCache;
}

export async function swr<T>(
  query: Prisma.Sql,
  maxAgeSeconds = 60
): Promise<T[]> {
  await connectionPromise;

  const { stillGoodKey, responseKey } = keys(query);
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
        log.debug(`Redis cache hit for (${responseKey}), returning...`);
      } else {
        log.debug(`Redis cache stale for (${responseKey}), revalidating...`);

        /* eslint-disable-next-line promise/no-nesting */
        (async () => {
          await revalidate(query, maxAgeSeconds);
        })().catch((e) => {
          log.error(`Failed to revalidate: ${(e as Error).stack}`);
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
      log.error(`Failed to seed cache: ${(e as Error).stack}`);
    });
  }

  return response;
}
