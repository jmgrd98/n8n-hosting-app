import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1', data: {} });

vi.mock('bullmq', () => {
  const MockQueue = vi.fn(function (this: Record<string, unknown>) {
    this.add = mockAdd;
  });
  return {
    Queue: MockQueue,
    Job: vi.fn(),
  };
});

vi.mock('../client', () => ({
  connection: { host: 'localhost', port: 6379 },
}));

import { queueTerraformJob, queueBackupJob, queueMetricsJob } from '../jobs';

describe('queueTerraformJob', () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it('adds job to terraform-jobs queue with correct name', async () => {
    const data = {
      action: 'create' as const,
      instanceId: 'inst-123',
      variables: { name: 'test-instance' },
    };

    await queueTerraformJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      'terraform-create',
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes correct job data', async () => {
    const data = {
      action: 'create' as const,
      instanceId: 'inst-456',
      variables: { name: 'my-instance', region: 'us-east-1' },
      userId: 'user-789',
    };

    await queueTerraformJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      data,
      expect.anything(),
    );
  });

  it('sets 3 attempts with exponential backoff at 5s', async () => {
    const data = {
      action: 'update' as const,
      instanceId: 'inst-123',
      variables: {},
    };

    await queueTerraformJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
  });

  it('sets removeOnComplete and removeOnFail options', async () => {
    const data = {
      action: 'destroy' as const,
      instanceId: 'inst-123',
      variables: {},
    };

    await queueTerraformJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
      }),
    );
  });

  it('returns the created job', async () => {
    const data = {
      action: 'scale' as const,
      instanceId: 'inst-123',
      variables: {},
    };

    const result = await queueTerraformJob(data);

    expect(result).toEqual({ id: 'job-1', data: {} });
  });
});

describe('queueBackupJob', () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it("adds job to backup-jobs queue with name 'backup-instance'", async () => {
    const data = {
      instanceId: 'inst-123',
      type: 'MANUAL' as const,
    };

    await queueBackupJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      'backup-instance',
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes correct data', async () => {
    const data = {
      instanceId: 'inst-789',
      type: 'MANUAL' as const,
    };

    await queueBackupJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      data,
      expect.anything(),
    );
  });

  it('sets 2 attempts with fixed backoff at 10s', async () => {
    const data = {
      instanceId: 'inst-123',
      type: 'MANUAL' as const,
    };

    await queueBackupJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
      }),
    );
  });
});

describe('queueMetricsJob', () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it("adds job to metrics-jobs queue with name 'collect-metrics'", async () => {
    const data = { instanceId: 'inst-123' };

    await queueMetricsJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      'collect-metrics',
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes correct data', async () => {
    const data = { instanceId: 'inst-999' };

    await queueMetricsJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      data,
      expect.anything(),
    );
  });

  it("sets repeat pattern '*/5 * * * *'", async () => {
    const data = { instanceId: 'inst-123' };

    await queueMetricsJob(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        repeat: { pattern: '*/5 * * * *' },
      }),
    );
  });
});
