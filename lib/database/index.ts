// lib/database/index.ts
import { 
  PrismaClient,
  Instance,
  User,
  Metric,
  Backup,
  ActivityLog,
  Deployment,
  InstanceStatus,
  InstanceSize,
  DeploymentStatus,
  DeploymentType,
  BackupType,
  // BackupStatus,
  ResourceMetrics,
  N8nMetrics,
  AWSResources,
  AccessDetails,
  // InstanceConfig,
  // Subscription,
  Prisma
} from '@prisma/client';
import crypto from 'crypto';

// Type definitions for complex return types
interface InstanceWithUser extends Instance {
  user: Pick<User, 'id' | 'email' | 'name'> | null;
}

interface InstanceStatistics {
  total: number;
  running: number;
  stopped: number;
  failed: number;
  totalCost: number;
}

interface UpdateInstanceStatusOptions {
  url?: string;
  awsResources?: Partial<AWSResources>;
  terraformOutputs?: Prisma.JsonValue;
}

interface CreateInstanceConfig {
  name?: string;
  version?: string;
  size?: string;
  region?: string;
  environment?: Record<string, string>;
}

interface MetricsInput {
  cpuUtilization?: number;
  memoryUsed?: number;
  memoryAvailable?: number;
  storageUsed?: number;
  storageAvailable?: number;
  networkIn?: number;
  networkOut?: number;
  workflowCount?: number;
  executionCount?: number;
  failedExecutions?: number;
}

interface DeploymentDetails {
  fromVersion?: string;
  toVersion?: string;
  changeSet?: string[];
}

interface UpdateDeploymentData {
  status?: DeploymentStatus;
  terraformOutput?: Prisma.JsonValue;
  errorMessage?: string;
  logs?: string[];
}

interface ActivityLogInput {
  userId: string;
  instanceId?: string;
  action: string;
  details?: Prisma.JsonValue;
  ipAddress?: string;
  userAgent?: string;
}

interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
}

// Resource configurations by size
const RESOURCE_CONFIGS: Record<InstanceSize, { cpu: string; memory: string; storage: string }> = {
  SMALL: { cpu: '0.5', memory: '1GB', storage: '20GB' },
  MEDIUM: { cpu: '1', memory: '2GB', storage: '50GB' },
  LARGE: { cpu: '2', memory: '4GB', storage: '100GB' },
  XLARGE: { cpu: '4', memory: '8GB', storage: '200GB' },
};

const MONTHLY_RATES: Record<InstanceSize, number> = {
  SMALL: 49,
  MEDIUM: 99,
  LARGE: 199,
  XLARGE: 399,
};

const HOURLY_RATES: Record<InstanceSize, number> = {
  SMALL: 0.05,
  MEDIUM: 0.10,
  LARGE: 0.20,
  XLARGE: 0.40,
};

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function updateInstanceStatus(
  instanceId: string,
  status: InstanceStatus,
  additionalData?: UpdateInstanceStatusOptions
): Promise<Instance | null> {
  const updateData: Prisma.InstanceUpdateInput = { status };
  
  if (status === 'RUNNING') {
    updateData.startedAt = new Date();
  } else if (status === 'STOPPED') {
    updateData.stoppedAt = new Date();
  }
  
  // For MongoDB embedded documents, use 'set' instead of nested updates
  if (additionalData?.url) {
    // First, get the existing access data
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      select: { access: true }
    });
    
    updateData.access = {
      set: {
        ...instance?.access,
        url: additionalData.url,
      } as AccessDetails
    };
  }
  
  if (additionalData?.awsResources) {
    updateData.awsResources = {
      set: additionalData.awsResources as AWSResources
    };
  }
  
  if (additionalData?.terraformOutputs) {
    updateData.terraformOutputs = additionalData.terraformOutputs;
  }
  
  // Check if instance exists first
  const exists = await prisma.instance.findUnique({
    where: { id: instanceId }
  });
  
  if (!exists) {
    console.error(`Instance ${instanceId} not found`);
    return null;
  }
  
  return await prisma.instance.update({
    where: { id: instanceId },
    data: updateData,
  });
}

export async function getInstanceById(instanceId: string): Promise<InstanceWithUser | null> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });
  
  if (!instance) return null;
  
  // Get user data separately
  const user = await prisma.user.findUnique({
    where: { id: instance.userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
  
  return {
    ...instance,
    user,
  };
}

export async function getUserInstances(userId: string): Promise<Instance[]> {
  console.log('Fetching instances for user:', userId);
  
  try {
    // First, let's check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log('User not found:', userId);
      return [];
    }
    
    // Query instances - handle cases where deletedAt might not exist
    const instances = await prisma.instance.findMany({
      where: { 
        userId: userId,
        OR: [
          { deletedAt: null },
          { deletedAt: { equals: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`Found ${instances.length} instances for user ${userId}`);
    
    return instances;
  } catch (error) {
    console.error('Error fetching user instances:', error);
    
    // Fallback: try without deletedAt filter
    try {
      const instances = await prisma.instance.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      });
      
      console.log(`Found ${instances.length} instances (without deletedAt filter) for user ${userId}`);
      return instances;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Optional: Function to sync instanceIds array
export async function syncUserInstanceIds(userId: string): Promise<void> {
  try {
    // Get all non-deleted instances for this user
    const instances = await prisma.instance.findMany({
      where: {
        userId: userId,
        OR: [
          { deletedAt: null },
          { deletedAt: { equals: null } }
        ]
      },
      select: { id: true },
    });
    
    // Update the user's instanceIds array
    await prisma.user.update({
      where: { id: userId },
      data: {
        instanceIds: instances.map(i => i.id),
      },
    });
    
    console.log(`Synced ${instances.length} instance IDs for user ${userId}`);
  } catch (error) {
    console.error('Error syncing instance IDs:', error);
  }
}

export async function deleteInstance(instanceId: string): Promise<Instance> {
  // Soft delete the instance
  const instance = await prisma.instance.update({
    where: { id: instanceId },
    data: {
      deletedAt: new Date(),
      status: 'DESTROYING',
    },
  });
  
  // Remove from user's instance list
  const remainingInstances = await prisma.instance.findMany({
    where: {
      userId: instance.userId,
      OR: [
        { deletedAt: null },
        { deletedAt: { equals: null } }
      ]
    },
    select: { id: true },
  });
  
  await prisma.user.update({
    where: { id: instance.userId },
    data: {
      instanceIds: remainingInstances.map(i => i.id),
    },
  });
  
  return instance;
}

// Activity Logging
export async function logActivity(input: ActivityLogInput): Promise<ActivityLog> {
  return await prisma.activityLog.create({
    data: input,
  });
}

// Metrics
export async function saveInstanceMetrics(
  instanceId: string,
  metrics: MetricsInput
): Promise<Metric> {
  const resourceMetrics: ResourceMetrics = {
    cpuUtilization: metrics.cpuUtilization ?? null,
    memoryUsed: metrics.memoryUsed ?? null,
    memoryAvailable: metrics.memoryAvailable ?? null,
    storageUsed: metrics.storageUsed ?? null,
    storageAvailable: metrics.storageAvailable ?? null,
    networkIn: metrics.networkIn ?? null,
    networkOut: metrics.networkOut ?? null,
  };
  
  const n8nMetrics: N8nMetrics | undefined = (
    metrics.workflowCount !== undefined || 
    metrics.executionCount !== undefined || 
    metrics.failedExecutions !== undefined
  ) ? {
    workflowCount: metrics.workflowCount ?? null,
    executionCount: metrics.executionCount ?? null,
    failedExecutions: metrics.failedExecutions ?? null,
    activeUsers: null,
    averageExecutionTime: null,
  } : undefined;
  
  const metric = await prisma.metric.create({
    data: {
      instanceId,
      resources: resourceMetrics,
      ...(n8nMetrics && { n8nMetrics }),
    },
  });
  
  // Update latest metrics in the instance document
  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      latestMetrics: {
        resources: metric.resources,
        n8nMetrics: metric.n8nMetrics ?? undefined,
        timestamp: metric.timestamp,
      },
    },
  });
  
  return metric;
}

// Backup Management
export async function createBackup(
  instanceId: string,
  type: BackupType = 'MANUAL'
): Promise<Backup> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
    select: { config: true },
  });
  
  return await prisma.backup.create({
    data: {
      instanceId,
      type,
      status: 'PENDING',
      instanceVersion: instance?.config.version || 'unknown',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });
}

// Deployment Tracking
export async function createDeployment(
  instanceId: string,
  type: DeploymentType,
  details?: DeploymentDetails
): Promise<Deployment> {
  return await prisma.deployment.create({
    data: {
      instanceId,
      type,
      status: 'PENDING',
      details: {
        fromVersion: details?.fromVersion ?? null,
        toVersion: details?.toVersion ?? null,
        changeSet: details?.changeSet || [],
        rollbackEnabled: false,
      },
    },
  });
}

export async function updateDeployment(
  deploymentId: string,
  data: UpdateDeploymentData
): Promise<Deployment> {
  const updateData: Prisma.DeploymentUpdateInput = {};
  
  if (data.status) updateData.status = data.status;
  if (data.terraformOutput) updateData.terraformOutput = data.terraformOutput;
  if (data.errorMessage) updateData.errorMessage = data.errorMessage;
  if (data.logs) {
    updateData.logs = { push: data.logs };
  }
  
  if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
    updateData.completedAt = new Date();
  }
  
  return await prisma.deployment.update({
    where: { id: deploymentId },
    data: updateData,
  });
}

// User Management
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(data: CreateUserData): Promise<User> {
  return await prisma.user.create({
    data: {
      ...data,
      instanceIds: [],
    },
  });
}

export function generateInstanceId(): string {
  // Always start with a letter to ensure AWS compatibility
  const prefix = 'n';
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}${timestamp}${random}`;
}

export async function createInstanceRecord({
  userId,
  status = 'PROVISIONING',
  config,
}: {
  userId: string;
  status?: InstanceStatus;
  config: CreateInstanceConfig;
}): Promise<Instance> {
  // Verify user exists first
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  const instanceSize = (config.size?.toUpperCase() as InstanceSize) || 'SMALL';
  
  // Create the instance
  const instance = await prisma.instance.create({
    data: {
      name: config.name || `n8n-${Date.now().toString(36)}`,
      userId: userId,
      status,
      config: {
        version: config.version || 'latest',
        size: instanceSize,
        region: config.region || 'us-east-1',
        environment: config.environment || {},
        resources: getResourcesForSize(instanceSize),
      },
      access: {
        adminUsername: 'admin@example.com',
        adminPasswordHash: generateSecurePassword(),
        apiKey: generateApiKey(),
        sshKeyName: null,
        url: null,
        webhookUrl: null,
      },
      monitoring: {
        metricsEnabled: true,
        logsRetention: 7,
        alertsEnabled: false,
        alertEndpoints: [],
      },
      billing: {
        monthlyCharge: getMonthlyChargeForSize(instanceSize),
        hourlyRate: getHourlyRateForSize(instanceSize),
        totalUsageHours: 0,
        lastBilledAt: null,
        nextBillingDate: null,
      },
      stats: {
        totalExecutions: 0,
        totalWorkflows: 0,
        totalUptime: 0,
        healthStatus: 'unknown',
        lastHealthCheck: null,
      },
    },
  });
  
  // Update user's instanceIds array
  await prisma.user.update({
    where: { id: userId },
    data: {
      instanceIds: {
        push: instance.id,
      },
    },
  });
  
  console.log(`Created instance ${instance.id} for user ${userId}`);
  return instance;
}

// Helper functions with proper types
function getMonthlyChargeForSize(size: InstanceSize): number {
  return MONTHLY_RATES[size];
}

function getHourlyRateForSize(size: InstanceSize): number {
  return HOURLY_RATES[size];
}

function getResourcesForSize(size: InstanceSize): { cpu: string; memory: string; storage: string } {
  return RESOURCE_CONFIGS[size];
}

function generateSecurePassword(): string {
  return crypto.randomBytes(32).toString('base64');
}

function generateApiKey(): string {
  return `n8n_${crypto.randomBytes(24).toString('hex')}`;
}

// Cleanup function for soft-deleted instances
export async function cleanupDeletedInstances(): Promise<Prisma.BatchPayload> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return await prisma.instance.deleteMany({
    where: {
      deletedAt: {
        lt: thirtyDaysAgo,
      },
    },
  });
}

// Aggregation queries
export async function getInstanceStatistics(userId: string): Promise<InstanceStatistics> {
  const instances = await prisma.instance.findMany({
    where: {
      userId,
      OR: [
        { deletedAt: null },
        { deletedAt: { equals: null } }
      ]
    },
  });
  
  const stats: InstanceStatistics = {
    total: instances.length,
    running: instances.filter(i => i.status === 'RUNNING').length,
    stopped: instances.filter(i => i.status === 'STOPPED').length,
    failed: instances.filter(i => i.status === 'FAILED').length,
    totalCost: instances.reduce((sum, i) => sum + (i.billing?.monthlyCharge || 0), 0),
  };
  
  return stats;
}

// Re-export types from Prisma for convenience
export type {
  Instance,
  User,
  Metric,
  Backup,
  ActivityLog,
  Deployment,
  InstanceStatus,
  InstanceSize,
  DeploymentStatus,
  DeploymentType,
  BackupType,
  BackupStatus,
} from '@prisma/client';