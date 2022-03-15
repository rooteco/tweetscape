import { createHash } from 'crypto';

import { Client } from 'pg';
import type { QueryResult } from 'pg';
import type { createClient } from 'redis';

import { log } from '~/utils.server';
import redisClient from '~/redis.server';
import { substr } from '~/utils';

interface RequestResponseCache<T> {
  (query: string, maxAgeSeconds?: number): Promise<QueryResult<T>>;
}

function createSwrRedisCache<T>({
  redisClient,
}: {
  redisClient: ReturnType<typeof createClient>;
}): RequestResponseCache<T> {
  let connectionPromise: Promise<void>;
  if (!redisClient.isOpen) {
    connectionPromise = redisClient.connect();
  }

  return async (query, maxAgeSeconds = 60) => {
    await connectionPromise;

    const key = createHash('sha256').update(query).digest('hex');

    const stillGoodKey = `swr:stillgood:${key}`;
    const responseKey = `swr:response:${key}`;

    const cachedStillGoodPromise = redisClient
      .get(stillGoodKey)
      .then((cachedStillGood) => {
        if (!cachedStillGood) {
          return false;
        }
        return true;
      })
      .catch(() => false);

    let response = await redisClient
      .get(responseKey)
      .then(async (cachedResponseString) => {
        if (!cachedResponseString) {
          return null;
        }

        const cachedResponse = JSON.parse(
          cachedResponseString
        ) as QueryResult<T>;

        if (await cachedStillGoodPromise) {
          log.debug(`Redis cache hit for key (${responseKey}), returning...`);
        } else {
          log.debug(
            `Redis cache stale for key (${responseKey}), revalidating...`
          );

          /* eslint-disable-next-line promise/no-nesting */
          (async () => {
            log.debug(`Establishing connection with PostgreSQL...`);
            const client = new Client({
              connectionString: process.env.DATABASE_URL,
            });
            client.on('error', (e) =>
              log.error(`PostgreSQL error: ${e.stack}`)
            );
            await client.connect();
            log.debug(`Executing PostgreSQL query (${substr(query, 50)})...`);
            const toCache = await client.query(query);
            log.debug(`Disconnecting client from PostgreSQL...`);
            await client.end();
            await redisClient.set(responseKey, JSON.stringify(toCache));
            await redisClient.setEx(stillGoodKey, maxAgeSeconds, 'true');
          })().catch((e) => {
            log.error(`Failed to revalidate: ${(e as Error).stack}`);
          });
        }

        return cachedResponse;
      })
      .catch(() => null);

    if (!response) {
      log.debug(`Establishing connection with PostgreSQL...`);
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      client.on('error', (e) => log.error(`PostgreSQL error: ${e.stack}`));
      await client.connect();
      log.debug(`Executing PostgreSQL query (${substr(query, 50)})...`);
      response = await client.query(query);
      log.debug(`Disconnecting client from PostgreSQL...`);
      await client.end();
      log.debug(`Redis cache miss for key (${responseKey}), querying...`);

      (async () => {
        await redisClient.set(responseKey, JSON.stringify(response));
        await redisClient.setEx(stillGoodKey, maxAgeSeconds, 'true');
      })().catch((e) => {
        log.error(`Failed to seed cache: ${(e as Error).stack}`);
      });
    }

    return response;
  };
}

export const db = createSwrRedisCache({ redisClient });
