import type {
  ITwitterApiRateLimitGetArgs,
  ITwitterApiRateLimitSetArgs,
  ITwitterApiRateLimitStore,
} from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiRateLimitMemoryStore } from '@twitter-api-v2/plugin-rate-limit';
import type { TwitterRateLimit } from 'twitter-api-v2';

import { db } from '~/db.server';
import { log } from '~/utils.server';

function limitToString(limit: TwitterRateLimit): string {
  return `rate limit (${limit.remaining}/${
    limit.limit
  } remaining until ${new Date(limit.reset * 1000).toLocaleString()})`;
}

export class TwitterApiRateLimitDBStore implements ITwitterApiRateLimitStore {
  private memoryStore = new TwitterApiRateLimitMemoryStore();

  public constructor(private uid: string) {}

  public async get(args: ITwitterApiRateLimitGetArgs) {
    log.debug(
      `Getting user (${this.uid}) rate limit for: ${args.method ?? 'GET'} ${
        args.endpoint
      }`
    );
    if (args.method) {
      const fromMemory = this.memoryStore.get(args);
      if (fromMemory) {
        log.debug(
          `Got user (${this.uid}) ${limitToString(fromMemory)} for: ${
            args.method
          } ${args.endpoint}`
        );
        return fromMemory;
      }
      const fromDB = await db.limits.findFirst({
        where: {
          influencer_id: this.uid,
          method: args.method,
          endpoint: args.endpoint,
          resets_at: { gt: new Date() },
        },
      });
      if (fromDB) {
        log.debug(
          `Got user (${this.uid}) ${limitToString(fromDB)} for: ${
            args.method
          } ${args.endpoint}`
        );
        return fromDB;
      }
    }
    const fromMemory = this.memoryStore.get(args);
    if (fromMemory) {
      log.debug(
        `Got user (${this.uid}) ${limitToString(fromMemory)} for: GET ${
          args.endpoint
        }`
      );
      return fromMemory;
    }
    const fromDB = await db.limits.findFirst({
      where: {
        influencer_id: this.uid,
        endpoint: args.endpoint,
        resets_at: { gt: new Date() },
      },
    });
    if (fromDB) {
      log.debug(
        `Got user (${this.uid}) ${limitToString(fromDB)} for: GET ${
          args.endpoint
        }`
      );
      return fromDB;
    }
    log.debug(
      `Could not find non-expired rate limit for user (${this.uid}) and: ${
        args.method ?? 'GET'
      } ${args.endpoint}`
    );
    /* eslint-disable-next-line no-useless-return, consistent-return */
    return;
  }

  public async set(args: ITwitterApiRateLimitSetArgs) {
    const limit = {
      ...args.rateLimit,
      method: args.method,
      endpoint: args.endpoint,
      influencer_id: this.uid,
      resets_at: new Date(args.rateLimit.reset * 1000),
    };
    log.debug(
      `Setting user (${this.uid}) ${limitToString(limit)} for: ${args.method} ${
        args.endpoint
      }`
    );
    this.memoryStore.set(args);
    await db.limits.upsert({
      create: limit,
      update: limit,
      where: {
        influencer_id_method_endpoint: {
          influencer_id: limit.influencer_id,
          endpoint: limit.endpoint,
          method: limit.method,
        },
      },
    });
  }

  public async delete(method: string, endpoint: string) {
    log.debug(
      `Deleting user (${this.uid}) rate limit for: ${method} ${endpoint}`
    );
    this.memoryStore.delete(method, endpoint);
    await db.limits.delete({
      where: {
        influencer_id_method_endpoint: {
          method,
          endpoint,
          influencer_id: this.uid,
        },
      },
    });
  }
}
