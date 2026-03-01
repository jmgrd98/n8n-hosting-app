import { Queue, Job, JobsOptions } from 'bullmq';
import { connection } from './client';
import { BackupJobData, MetricsJobData, TerraformJobData } from '@/types/infrastructure';

let _terraformQueue: Queue<TerraformJobData> | null = null;
let _backupQueue: Queue<BackupJobData> | null = null;
let _metricsQueue: Queue<MetricsJobData> | null = null;

function getTerraformQueue(): Queue<TerraformJobData> {
  if (!_terraformQueue) {
    _terraformQueue = new Queue<TerraformJobData>('terraform-jobs', { connection });
  }
  return _terraformQueue;
}

function getBackupQueue(): Queue<BackupJobData> {
  if (!_backupQueue) {
    _backupQueue = new Queue<BackupJobData>('backup-jobs', { connection });
  }
  return _backupQueue;
}

function getMetricsQueue(): Queue<MetricsJobData> {
  if (!_metricsQueue) {
    _metricsQueue = new Queue<MetricsJobData>('metrics-jobs', { connection });
  }
  return _metricsQueue;
}

export const terraformQueue = new Proxy({} as Queue<TerraformJobData>, {
  get(_, prop) {
    const instance = getTerraformQueue();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const backupQueue = new Proxy({} as Queue<BackupJobData>, {
  get(_, prop) {
    const instance = getBackupQueue();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const metricsQueue = new Proxy({} as Queue<MetricsJobData>, {
  get(_, prop) {
    const instance = getMetricsQueue();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

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

  const job = await getTerraformQueue().add(
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

  const job = await getBackupQueue().add(
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

  const job = await getMetricsQueue().add(
    'collect-metrics',
    data,
    options
  );

  return job;
}
