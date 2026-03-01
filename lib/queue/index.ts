// lib/queue/index.ts
import { Queue } from 'bullmq';
import { connection } from './client';
import type { TerraformJobData } from '@/types/infrastructure';

let _provisioningQueue: Queue<TerraformJobData> | null = null;

export function getProvisioningQueue(): Queue<TerraformJobData> {
  if (!_provisioningQueue) {
    _provisioningQueue = new Queue<TerraformJobData>('terraform-jobs', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }
  return _provisioningQueue;
}

// Lazy proxy for backward compatibility
export const provisioningQueue = new Proxy({} as Queue<TerraformJobData>, {
  get(_, prop) {
    const instance = getProvisioningQueue();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// Export for backward compatibility
export { isQueueAvailable } from './client';
