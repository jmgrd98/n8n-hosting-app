// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Add TLS for production Redis (Upstash, Redis Cloud, etc.)
  ...(process.env.NODE_ENV === 'production' && {
    tls: {
      rejectUnauthorized: true,
    },
  }),
};

export const connection: ConnectionOptions = redisConfig;

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(redisConfig);

    _redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    _redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }
  return _redis;
}

// Lazy proxy so existing `import { redis }` still works without connecting at import time
export const redis = new Proxy({} as IORedis, {
  get(_, prop) {
    const instance = getRedis();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const isQueueAvailable = true;
