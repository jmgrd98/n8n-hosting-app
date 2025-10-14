// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

export const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Add TLS for production Redis (Upstash, Redis Cloud, etc.)
  ...(process.env.NODE_ENV === 'production' && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

export const redis = new IORedis(connection);

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

export const isQueueAvailable = true;