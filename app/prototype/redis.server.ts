import { createClient } from 'redis';

declare global {
  var redis: ReturnType<typeof createClient>;
}

if (!global.redis) global.redis = createClient({ url: process.env.REDIS_URL });

export const redis = global.redis;
