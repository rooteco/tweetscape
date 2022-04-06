import { createHash } from 'crypto';

import type {
  ITwitterApiRateLimitGetArgs,
  ITwitterApiRateLimitSetArgs,
  ITwitterApiRateLimitStore,
} from '@twitter-api-v2/plugin-rate-limit';
import { parse, stringify } from 'json-bigint';
import { TwitterApiRateLimitMemoryStore } from '@twitter-api-v2/plugin-rate-limit';
import type { TwitterRateLimit } from 'twitter-api-v2';

import { log } from '~/utils.server';
import { redis } from '~/redis.server';

let connectionPromise: Promise<void>;
if (!redis.isOpen) connectionPromise = redis.connect();

export class TwitterApiRateLimitDBStore implements ITwitterApiRateLimitStore {
  private store = new TwitterApiRateLimitMemoryStore();

  public constructor(private uid: bigint) {}

  private key(endpoint: string, method = 'GET') {
    const hash = createHash('sha256');
    hash.update(this.uid.toString());
    hash.update(endpoint);
    hash.update(method);
    return `limit:${hash.digest('hex')}`;
  }

  public async get(args: ITwitterApiRateLimitGetArgs) {
    const method = args.method ?? 'GET';
    log.trace(`Getting rate limit for: ${method} ${args.endpoint}`);
    await connectionPromise;
    const mem = this.store.get(args);
    if (mem) {
      log.trace(`Got rate limit from memory for: ${method} ${args.endpoint}`);
      return mem;
    }
    const key = this.key(args.endpoint, method);
    const cache = await redis.get(key);
    if (cache) {
      log.trace(`Got rate limit from redis key: ${key}`);
      return parse(cache) as TwitterRateLimit;
    }
    return undefined;
  }

  public async set(args: ITwitterApiRateLimitSetArgs) {
    const lim = `(${args.rateLimit.remaining}/${args.rateLimit.limit})`;
    log.trace(`Setting rate limit ${lim} for: ${args.method} ${args.endpoint}`);
    this.store.set(args);
    await redis.setEx(
      this.key(args.endpoint, args.method),
      Math.ceil(args.rateLimit.reset - new Date().valueOf() / 1000),
      stringify(args.rateLimit)
    );
  }
}
