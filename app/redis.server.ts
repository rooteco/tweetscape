import { createClient } from 'redis';

declare global {
  var __redis: ReturnType<typeof createClient>;
}

if (!global.__redis)
  global.__redis = createClient({ url: process.env.REDIS_URL });

export const redis = global.__redis;
