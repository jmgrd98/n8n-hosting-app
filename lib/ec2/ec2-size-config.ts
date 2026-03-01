import { InstanceSize } from '@prisma/client';

export interface EC2SizeConfig {
  instanceType: string;
  volumeSizeGb: number;
  description: string;
  monthlyCostEstimate: number;
}

export const EC2_SIZE_CONFIGS: Record<InstanceSize, EC2SizeConfig> = {
  SMALL: {
    instanceType: 't3.micro',
    volumeSizeGb: 20,
    description: '2 vCPU, 1GB RAM',
    monthlyCostEstimate: 13.34,
  },
  MEDIUM: {
    instanceType: 't3.small',
    volumeSizeGb: 30,
    description: '2 vCPU, 2GB RAM',
    monthlyCostEstimate: 19.52,
  },
  LARGE: {
    instanceType: 't3.medium',
    volumeSizeGb: 50,
    description: '2 vCPU, 4GB RAM',
    monthlyCostEstimate: 35.43,
  },
  XLARGE: {
    instanceType: 't3.large',
    volumeSizeGb: 100,
    description: '2 vCPU, 8GB RAM',
    monthlyCostEstimate: 69.09,
  },
};
