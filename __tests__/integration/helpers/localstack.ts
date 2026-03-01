import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import IORedis from 'ioredis';

const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380');

/**
 * Waits for LocalStack S3 and DynamoDB to be ready.
 * Throws after maxRetries if services aren't available.
 */
export async function waitForLocalStack(maxRetries = 10): Promise<void> {
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: LOCALSTACK_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  const dynamo = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: LOCALSTACK_ENDPOINT,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: 'n8n-terraform-state-test' }));
      await dynamo.send(new DescribeTableCommand({ TableName: 'terraform-locks' }));
      return;
    } catch {
      if (i === maxRetries - 1) {
        throw new Error(
          `LocalStack services not ready after ${maxRetries} retries. ` +
          'Make sure LocalStack is running: npm run test:integration:up'
        );
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Waits for Redis to accept connections.
 */
export async function waitForRedis(maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new IORedis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await client.connect();
      await client.ping();
      await client.quit();
      return;
    } catch {
      if (i === maxRetries - 1) {
        throw new Error(
          `Redis not ready after ${maxRetries} retries. ` +
          'Make sure Redis is running: npm run test:integration:up'
        );
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

/**
 * Creates a fresh IORedis client for tests. Caller must call quit() when done.
 */
export function createTestRedis(): IORedis {
  return new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
