import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { waitForRedis, createTestRedis } from './helpers/localstack';
import { TerraformJobData } from '@/types/infrastructure';
import IORedis from 'ioredis';

describe('BullMQ Queue (integration with Redis)', () => {
  let redis: IORedis;
  let queue: Queue<TerraformJobData>;

  const connectionConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };

  beforeAll(async () => {
    await waitForRedis();
    redis = createTestRedis();
    queue = new Queue<TerraformJobData>('test-terraform-jobs', {
      connection: connectionConfig,
    });
  });

  afterEach(async () => {
    await queue.drain();
  });

  afterAll(async () => {
    await queue.close();
    await redis.flushdb();
    await redis.quit();
  });

  it('adds a job to the queue and retrieves it', async () => {
    const jobData: TerraformJobData = {
      action: 'create',
      instanceId: 'queue-test-1',
      variables: { name: 'test-instance' },
    };

    const job = await queue.add('terraform-create', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    expect(job.id).toBeDefined();
    expect(job.data).toEqual(jobData);
    expect(job.name).toBe('terraform-create');
  });

  it('processes a job through a worker', async () => {
    const processedJobs: TerraformJobData[] = [];

    const worker = new Worker<TerraformJobData>(
      'test-terraform-jobs',
      async (job: Job<TerraformJobData>) => {
        processedJobs.push(job.data);
        return { success: true };
      },
      { connection: connectionConfig }
    );

    const jobData: TerraformJobData = {
      action: 'destroy',
      instanceId: 'queue-test-2',
      variables: {},
    };

    await queue.add('terraform-destroy', jobData);

    // Wait for the worker to process the job
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker did not process job in time')), 10000);
      worker.on('completed', () => {
        clearTimeout(timeout);
        resolve();
      });
      worker.on('failed', (_job, err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    expect(processedJobs).toHaveLength(1);
    expect(processedJobs[0].action).toBe('destroy');
    expect(processedJobs[0].instanceId).toBe('queue-test-2');

    await worker.close();
  });

  it('respects job options (attempts, backoff)', async () => {
    const job = await queue.add(
      'terraform-create',
      {
        action: 'create',
        instanceId: 'queue-test-3',
        variables: {},
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
      }
    );

    expect(job.opts.attempts).toBe(3);
    expect(job.opts.backoff).toEqual({ type: 'exponential', delay: 5000 });
  });

  it('handles job failure and retry', async () => {
    let attemptCount = 0;

    const worker = new Worker<TerraformJobData>(
      'test-terraform-jobs',
      async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Simulated failure');
        }
        return { success: true };
      },
      { connection: connectionConfig }
    );

    await queue.add(
      'terraform-create',
      { action: 'create', instanceId: 'retry-test', variables: {} },
      { attempts: 3, backoff: { type: 'fixed', delay: 100 } }
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker did not complete retry in time')), 15000);
      worker.on('completed', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    expect(attemptCount).toBe(2);

    await worker.close();
  });
});
