import { createHash } from 'crypto';

import { createClient } from 'redis';

import { db } from '~/db.server';
import { log } from '~/utils.server';
import { substr } from '~/utils';

declare global {
  var redisClient: ReturnType<typeof createClient>;
}

if (!global.redisClient)
  global.redisClient = createClient({ url: process.env.REDIS_URL });

let connectionPromise: Promise<void>;
if (!redisClient.isOpen) connectionPromise = redisClient.connect();

function keys(query: string): { stillGoodKey: string; responseKey: string } {
  const key = createHash('sha256').update(query).digest('hex');
  const stillGoodKey = `swr:stillgood:${key}`;
  const responseKey = `swr:response:${key}`;
  return { stillGoodKey, responseKey };
}

export async function revalidate<T>(
  query: string,
  maxAgeSeconds = 60
): Promise<T[]> {
  const { stillGoodKey, responseKey } = keys(query);
  log.debug(`Executing PostgreSQL query (${substr(query, 50)})...`);
  const toCache = await db.$queryRawUnsafe<T[]>(query);
  await redisClient.set(responseKey, JSON.stringify(toCache));
  await redisClient.setEx(stillGoodKey, maxAgeSeconds, 'true');
  return toCache;
}

export async function swr<T>(query: string, maxAgeSeconds = 60): Promise<T[]> {
  await connectionPromise;

  const { stillGoodKey, responseKey } = keys(query);
  const cachedStillGoodPromise = redisClient
    .get(stillGoodKey)
    .then((cachedStillGood) => !!cachedStillGood)
    .catch(() => false);

  let response = await redisClient
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
    log.debug(`Executing PostgreSQL query (${substr(query, 50)})...`);
    response = await db.$queryRawUnsafe<T[]>(query);

    (async () => {
      await redisClient.set(responseKey, JSON.stringify(response));
      await redisClient.setEx(stillGoodKey, maxAgeSeconds, 'true');
    })().catch((e) => {
      log.error(`Failed to seed cache: ${(e as Error).stack}`);
    });
  }

  return response;
}
