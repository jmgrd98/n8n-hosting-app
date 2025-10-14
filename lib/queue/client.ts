// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

export const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // TLS for production
  tls: process.env.REDIS_HOST !== 'localhost' ? {
    rejectUnauthorized: false,
  } : undefined,
  // Connection stability settings
  retryStrategy(times) {
    if (times > 10) {
      console.error('❌ Redis connection failed after 10 retries');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`⏳ Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  // Keep connection alive
  keepAlive: 30000,
  connectTimeout: 10000,
  // Reconnect on error
  reconnectOnError(err) {
    console.log('🔄 Reconnecting on error:', err.message);
    return true;
  },
  // Reduce command timeout
  commandTimeout: 5000,
  // Enable auto-reconnect
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  lazyConnect: false,
  // Connection name for debugging
  connectionName: 'n8n-hosting-queue',
};

export const redis = new IORedis(connection);

// Handle connection events
redis.on('connect', () => {
  console.log('🔌 Redis connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redis.on('error', (err) => {
  // Only log errors that aren't reconnection errors
  if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
    console.error('❌ Redis error:', err.message);
  }
});

redis.on('close', () => {
  console.warn('⚠️  Redis connection closed');
});

redis.on('reconnecting', (timeToReconnect) => {
  console.log(`🔄 Redis reconnecting in ${timeToReconnect}ms...`);
});

redis.on('end', () => {
  console.warn('⚠️  Redis connection ended');
});

export const isQueueAvailable = true;