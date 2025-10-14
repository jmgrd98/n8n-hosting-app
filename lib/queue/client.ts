// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

// Function to create connection config
function createRedisConnection(): IORedis {
  // If REDIS_URL is provided, use it directly (best approach)
  if (process.env.REDIS_URL) {
    console.log('📡 Using REDIS_URL for connection');
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // These settings help with connection stability
      retryStrategy(times) {
        if (times > 10) {
          console.error('❌ Redis connection failed after 10 retries');
          return null;
        }
        const delay = Math.min(times * 200, 3000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE'];
        if (targetErrors.some(e => err.message.includes(e))) {
          return true;
        }
        return false;
      },
      // Connection stability
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: true,
      lazyConnect: false,
      // Don't auto-pipeline to avoid EPIPE issues
      enableAutoPipelining: false,
    });
  }

  // Fallback to individual env vars
  console.log('📡 Using individual env vars for Redis connection');
  const config: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_HOST !== 'localhost' ? {
      rejectUnauthorized: false,
    } : undefined,
    retryStrategy(times) {
      if (times > 10) {
        console.error('❌ Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE'];
      if (targetErrors.some(e => err.message.includes(e))) {
        return true;
      }
      return false;
    },
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    enableOfflineQueue: true,
    lazyConnect: false,
    enableAutoPipelining: false,
  };

  return new IORedis(config);
}

export const redis = createRedisConnection();

// For BullMQ - export the connection for workers
export const connection = redis;

// Suppress noisy EPIPE/ECONNRESET errors in logs
redis.on('error', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    // These are handled by reconnectOnError, don't spam logs
    return;
  }
  console.error('❌ Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('🔌 Redis connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis ready and accepting commands');
});

redis.on('close', () => {
  console.warn('⚠️  Redis connection closed, will attempt reconnect');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

export const isQueueAvailable = true;