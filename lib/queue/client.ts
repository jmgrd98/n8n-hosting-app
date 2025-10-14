// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

// Function to create Upstash-compatible Redis connection
function createRedisConnection(): IORedis {
  // If REDIS_URL is provided, use it directly
  if (process.env.REDIS_URL) {
    console.log('📡 Using REDIS_URL for Upstash connection');
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      
      // CRITICAL: Disable CLIENT SETINFO for Upstash compatibility
      // This is the command that's failing in your logs
      showFriendlyErrorStack: false,
      
      // Connection stability
      retryStrategy(times) {
        if (times > 10) {
          console.error('❌ Redis connection failed after 10 retries');
          return null;
        }
        const delay = Math.min(times * 200, 3000);
        return delay;
      },
      
      // Don't reconnect on these specific Upstash errors
      reconnectOnError(err) {
        // Don't try to reconnect for unsupported commands
        if (err.message.includes('CLIENT SETINFO')) {
          return false;
        }
        const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE'];
        return targetErrors.some(e => err.message.includes(e));
      },
      
      // Keep connection alive
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 10000, // Increased for Upstash
      
      // Disable auto-pipelining for Upstash
      enableAutoPipelining: false,
      
      // Don't use lazyConnect with Upstash
      lazyConnect: false,
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
    enableOfflineQueue: true,
    showFriendlyErrorStack: false,
    tls: process.env.REDIS_HOST !== 'localhost' ? {
      rejectUnauthorized: false,
    } : undefined,
    retryStrategy(times) {
      if (times > 10) {
        return null;
      }
      return Math.min(times * 200, 3000);
    },
    reconnectOnError(err) {
      if (err.message.includes('CLIENT SETINFO')) {
        return false;
      }
      const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE'];
      return targetErrors.some(e => err.message.includes(e));
    },
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 10000,
    enableAutoPipelining: false,
    lazyConnect: false,
  };

  return new IORedis(config);
}

export const redis = createRedisConnection();

// For BullMQ - export the connection for workers
export const connection = redis;

// Suppress specific errors that are expected with Upstash
redis.on('error', (err) => {
  // Suppress CLIENT SETINFO errors - this is expected with Upstash
  if (err.message.includes('CLIENT SETINFO')) {
    return;
  }
  // Suppress connection errors that auto-reconnect
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    return;
  }
  // Log other errors
  console.error('❌ Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('🔌 Redis connecting to Upstash...');
});

redis.on('ready', () => {
  console.log('✅ Redis connected and ready');
});

redis.on('close', () => {
  console.warn('⚠️  Redis connection closed, will attempt reconnect');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

export const isQueueAvailable = true;