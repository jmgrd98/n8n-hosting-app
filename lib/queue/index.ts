// lib/queue/index.ts
import { Queue } from 'bullmq';
import { connection } from './client';
import type { TerraformJobData } from '@/types/infrastructure';

// Export the provisioning queue for use in API routes
export const provisioningQueue = new Queue<TerraformJobData>('terraform-jobs', {
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

// Export for backward compatibility
export { isQueueAvailable } from './client';