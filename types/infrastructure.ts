import { InstanceSize, InstanceStatus, BackupType, PlanType as PrismaPlanType } from '@prisma/client';
import type Stripe from 'stripe';
import type { Readable } from 'stream';

// ============================================================================
// Terraform Types
// ============================================================================

export interface TerraformOutputValue<T = unknown> {
  value: T;
  sensitive: boolean;
  type: string;
}

export interface TerraformOutputs {
  instance_url?: TerraformOutputValue<string>;
  alb_dns_name?: TerraformOutputValue<string>;
  database_endpoint?: TerraformOutputValue<string>;
  ecs_cluster_name?: TerraformOutputValue<string>;
  ecs_service_name?: TerraformOutputValue<string>;
  vpc_id?: TerraformOutputValue<string>;
  [key: string]: TerraformOutputValue<unknown> | undefined;
}

export interface TerraformConfig {
  name: string;
  size: InstanceSize;
  version: string;
  region: string;
  userId: string;
  environment?: Record<string, string>;
}

export interface TerraformVariables extends TerraformConfig {
  instanceId: string;
  vpc_cidr?: string;
  public_subnet_cidrs?: string[];
  db_instance_class?: string;
  db_storage_size?: number;
  ecs_cpu?: string;
  ecs_memory?: string;
  tags?: Record<string, string>;
}

export interface SizeConfig {
  ecs_cpu: string;
  ecs_memory: string;
  db_instance_class: string;
  db_storage_size: number;
}

// ============================================================================
// Job Queue Types
// ============================================================================

export interface TerraformJobData {
  action: 'create' | 'update' | 'destroy' | 'restart' | 'scale';
  instanceId: string;
  variables: Partial<TerraformVariables>;
  userId?: string;
}

export interface BackupJobData {
  instanceId: string;
  type: BackupType;
}

export interface MetricsJobData {
  instanceId: string;
}

// ============================================================================
// Subscription Types
// ============================================================================

export type PlanType = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface CheckoutSessionConfig {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PriceIds {
  STARTER: string;
  PROFESSIONAL: string;
  ENTERPRISE: string;
}

export interface InstanceLimits {
  FREE: number;
  STARTER: number;
  PROFESSIONAL: number;
  ENTERPRISE: number;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface RemoteStateConfig {
  backend: 's3' | 'local';
  config: S3StateConfig | LocalStateConfig;
}

export interface S3StateConfig {
  bucket: string;
  key: string;
  region: string;
  encrypt: boolean;
  dynamodb_table: string;
}

export interface LocalStateConfig {
  path: string;
}

export interface LockInfo {
  instanceId: string;
  timestamp: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface AWSError extends Error {
  name: string;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

export class TerraformError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'TerraformError';
  }
}

export class StateManagerError extends Error {
  constructor(
    message: string,
    public readonly operation: 'lock' | 'unlock' | 'get' | 'save' | 'delete',
    public readonly instanceId: string
  ) {
    super(message);
    this.name = 'StateManagerError';
  }
}

// ============================================================================
// AWS SDK Types
// ============================================================================

export interface S3StreamBody extends Readable {
  transformToByteArray(): Promise<Uint8Array>;
  transformToString(): Promise<string>;
  transformToWebStream(): ReadableStream;
}