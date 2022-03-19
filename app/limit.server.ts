import type {
  ITwitterApiRateLimitGetArgs,
  ITwitterApiRateLimitSetArgs,
  ITwitterApiRateLimitStore,
} from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiRateLimitMemoryStore } from '@twitter-api-v2/plugin-rate-limit';

import { db } from '~/db.server';

export class TwitterApiRateLimitDBStore implements ITwitterApiRateLimitStore {
  private memoryStore = new TwitterApiRateLimitMemoryStore();

  public constructor(private uid: string) {}

  public async get(args: ITwitterApiRateLimitGetArgs) {
    if (args.method)
      return (
        this.memoryStore.get(args) ??
        (await db.limits.findFirst({
          where: {
            influencer_id: this.uid,
            method: args.method,
            endpoint: args.endpoint,
            resets_at: { gt: new Date() },
          },
        })) ??
        undefined
      );
    return (
      this.memoryStore.get(args) ??
      (await db.limits.findFirst({
        where: {
          influencer_id: this.uid,
          endpoint: args.endpoint,
          resets_at: { gt: new Date() },
        },
      })) ??
      undefined
    );
  }

  public async set(args: ITwitterApiRateLimitSetArgs) {
    this.memoryStore.set(args);
    const limit = {
      ...args.rateLimit,
      method: args.method,
      endpoint: args.endpoint,
      influencer_id: this.uid,
      resets_at: new Date(args.rateLimit.reset * 1000),
    };
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
