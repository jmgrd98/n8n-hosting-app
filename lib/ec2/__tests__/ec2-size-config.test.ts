import { describe, it, expect } from 'vitest';
import { EC2_SIZE_CONFIGS } from '../ec2-size-config';

describe('EC2_SIZE_CONFIGS', () => {
  it('has configs for all four instance sizes', () => {
    expect(EC2_SIZE_CONFIGS).toHaveProperty('SMALL');
    expect(EC2_SIZE_CONFIGS).toHaveProperty('MEDIUM');
    expect(EC2_SIZE_CONFIGS).toHaveProperty('LARGE');
    expect(EC2_SIZE_CONFIGS).toHaveProperty('XLARGE');
    expect(Object.keys(EC2_SIZE_CONFIGS)).toHaveLength(4);
  });

  it('SMALL uses t3.micro with 20GB', () => {
    expect(EC2_SIZE_CONFIGS.SMALL.instanceType).toBe('t3.micro');
    expect(EC2_SIZE_CONFIGS.SMALL.volumeSizeGb).toBe(20);
  });

  it('MEDIUM uses t3.small with 30GB', () => {
    expect(EC2_SIZE_CONFIGS.MEDIUM.instanceType).toBe('t3.small');
    expect(EC2_SIZE_CONFIGS.MEDIUM.volumeSizeGb).toBe(30);
  });

  it('LARGE uses t3.medium with 50GB', () => {
    expect(EC2_SIZE_CONFIGS.LARGE.instanceType).toBe('t3.medium');
    expect(EC2_SIZE_CONFIGS.LARGE.volumeSizeGb).toBe(50);
  });

  it('XLARGE uses t3.large with 100GB', () => {
    expect(EC2_SIZE_CONFIGS.XLARGE.instanceType).toBe('t3.large');
    expect(EC2_SIZE_CONFIGS.XLARGE.volumeSizeGb).toBe(100);
  });

  it('sizes scale up in cost', () => {
    const costs = [
      EC2_SIZE_CONFIGS.SMALL.monthlyCostEstimate,
      EC2_SIZE_CONFIGS.MEDIUM.monthlyCostEstimate,
      EC2_SIZE_CONFIGS.LARGE.monthlyCostEstimate,
      EC2_SIZE_CONFIGS.XLARGE.monthlyCostEstimate,
    ];

    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('all configs have descriptions', () => {
    for (const config of Object.values(EC2_SIZE_CONFIGS)) {
      expect(config.description).toBeTruthy();
      expect(config.description.length).toBeGreaterThan(0);
    }
  });
});
