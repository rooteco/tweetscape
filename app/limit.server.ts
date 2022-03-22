import { createHash } from 'crypto';

import type {
  ITwitterApiRateLimitGetArgs,
  ITwitterApiRateLimitSetArgs,
  ITwitterApiRateLimitStore,
} from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiRateLimitMemoryStore } from '@twitter-api-v2/plugin-rate-limit';
import type { TwitterRateLimit } from 'twitter-api-v2';

import { log } from '~/utils.server';
import { redis } from '~/redis.server';

let connectionPromise: Promise<void>;
if (!redis.isOpen) connectionPromise = redis.connect();

export class TwitterApiRateLimitDBStore implements ITwitterApiRateLimitStore {
  private store = new TwitterApiRateLimitMemoryStore();

  public constructor(private uid: string) {}

  private key(endpoint: string, method = 'GET') {
    const hash = createHash('sha256');
    hash.update(this.uid);
    hash.update(endpoint);
    hash.update(method);
    return `limit:${hash.digest('hex')}`;
  }

  public async get(args: ITwitterApiRateLimitGetArgs) {
    const method = args.method ?? 'GET';
    log.trace(`Getting rate limit for: ${method} ${args.endpoint}`);
    await connectionPromise;
    const mem = this.store.get(args);
    if (mem) return mem;
    const cache = await redis.get(this.key(args.endpoint, method));
    if (cache) return JSON.parse(cache) as TwitterRateLimit;
    return undefined;
  }

  public async set(args: ITwitterApiRateLimitSetArgs) {
    const lim = `(${args.rateLimit.remaining}/${args.rateLimit.limit})`;
    log.trace(`Setting rate limit ${lim} for: ${args.method} ${args.endpoint}`);
    this.store.set(args);
    await redis.setEx(
      this.key(args.endpoint, args.method),
      args.rateLimit.reset,
      JSON.stringify(args.rateLimit)
    );
  }
}
