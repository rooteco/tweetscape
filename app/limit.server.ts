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

  private key(endpoint: string, method?: string) {
    const hash = createHash('sha256');
    hash.update(this.uid);
    hash.update(endpoint);
    if (method) hash.update(method);
    return `limit:${hash.digest('hex')}`;
  }

  public async get(args: ITwitterApiRateLimitGetArgs) {
    log.trace(`Getting rate limit for: ${args.method} ${args.endpoint}`);
    await connectionPromise;
    const mem = this.store.get(args);
    if (mem) return mem;
    const cache = await redis.get(this.key(args.endpoint, args.method));
    if (cache) return JSON.parse(cache) as TwitterRateLimit;
    return undefined;
  }

  public async set(args: ITwitterApiRateLimitSetArgs) {
    log.trace(`Setting rate limit for: ${args.method} ${args.endpoint}`);
    this.store.set(args);
    await redis.setEx(
      this.key(args.endpoint, args.method),
      args.rateLimit.reset,
      JSON.stringify(args.rateLimit)
    );
  }
}
