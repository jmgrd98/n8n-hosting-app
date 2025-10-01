import { Queue, Job, JobsOptions } from 'bullmq';
import { connection } from './client';
import { BackupJobData, MetricsJobData, TerraformJobData } from '@/types/infrastructure';
// Import job data types from above

// Create strongly typed queues
export const terraformQueue = new Queue<TerraformJobData>('terraform-jobs', { connection });
export const backupQueue = new Queue<BackupJobData>('backup-jobs', { connection });
export const metricsQueue = new Queue<MetricsJobData>('metrics-jobs', { connection });

// Queue terraform job with proper typing
export async function queueTerraformJob(data: TerraformJobData): Promise<Job<TerraformJobData>> {
  const options: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  };
  
  const job = await terraformQueue.add(
    `terraform-${data.action}`,
    data,
    options
  );
  
  return job;
}

// Queue backup job with proper typing
export async function queueBackupJob(data: BackupJobData): Promise<Job<BackupJobData>> {
  const options: JobsOptions = {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  };
  
  const job = await backupQueue.add(
    'backup-instance',
    data,
    options
  );
  
  return job;
}

// Queue metrics collection job with proper typing
export async function queueMetricsJob(data: MetricsJobData): Promise<Job<MetricsJobData>> {
  const options: JobsOptions = {
    repeat: {
      pattern: '*/5 * * * *', // Every 5 minutes
    },
  };
  
  const job = await metricsQueue.add(
    'collect-metrics',
    data,
    options
  );
  
  return job;
}