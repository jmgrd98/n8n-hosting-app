// lib/queue/client.ts
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';


export const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export const redis = new IORedis(connection);
export const isQueueAvailable = true;