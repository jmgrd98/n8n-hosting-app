// lib/queue/workers/terraform.worker.ts
import { Worker, Job } from 'bullmq';
import { connection } from '../client';
import { TerraformExecutor } from '@/lib/terraform/executor';
import { DockerProvisioner } from '@/lib/docker';
import { EC2Provisioner } from '@/lib/ec2';
import { updateInstanceStatus, prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';
import { TerraformJobData, TerraformVariables } from '@/types/infrastructure';
import { email } from '@/lib/email';

type ProvisioningMode = 'local-docker' | 'ec2-docker' | 'ecs-fargate';

function getProvisioningMode(): ProvisioningMode {
  if (process.env.USE_LOCAL_DOCKER === 'true') return 'local-docker';
  if (process.env.USE_EC2_DOCKER === 'true') return 'ec2-docker';
  return 'ecs-fargate';
}

export const terraformWorker = new Worker<TerraformJobData>(
  'terraform-jobs',
  async (job: Job<TerraformJobData>) => {
    console.log('📋 Processing terraform job:', {
      id: job.id,
      name: job.name,
      instanceId: job.data.instanceId,
      action: job.data.action
    });
    
    const { action, instanceId, variables } = job.data;

    const mode = getProvisioningMode();
    console.log(`📍 Provisioning mode: ${mode}`);

    try {
      switch (mode) {
        case 'local-docker': {
          const provisioner = new DockerProvisioner(instanceId);
          switch (action) {
            case 'create':
              await handleDockerCreate(job, provisioner, instanceId);
              break;
            case 'destroy':
              await handleDockerDestroy(provisioner, instanceId);
              break;
            case 'restart':
              await handleDockerRestart(provisioner, instanceId);
              break;
            case 'update':
              await handleUpdate(instanceId);
              break;
            case 'scale':
              await handleScale(instanceId);
              break;
          }
          break;
        }
        case 'ec2-docker': {
          const ec2Region = variables?.region;
          const provisioner = new EC2Provisioner(instanceId, ec2Region);
          switch (action) {
            case 'create':
              await handleEC2Create(job, provisioner, instanceId);
              break;
            case 'destroy':
              await handleEC2Destroy(provisioner, instanceId);
              break;
            case 'restart':
              await handleEC2Restart(instanceId);
              break;
            case 'update':
              await handleUpdate(instanceId);
              break;
            case 'scale':
              await handleScale(instanceId);
              break;
          }
          break;
        }
        case 'ecs-fargate': {
          const executor = new TerraformExecutor(instanceId);
          switch (action) {
            case 'create':
              await handleCreate(job, executor, instanceId, variables);
              break;
            case 'destroy':
              await handleDestroy(executor, instanceId);
              break;
            case 'update':
              await handleUpdate(instanceId);
              break;
            case 'restart':
              await handleRestart(executor, instanceId);
              break;
            case 'scale':
              await handleScale(instanceId);
              break;
          }
          break;
        }
      }
    } catch (error) {
      console.error(`❌ Job failed for ${instanceId}:`, error);
      await updateInstanceStatus(instanceId, 'FAILED');

      // Send instance failed email notification
      notifyInstanceOwner(instanceId, (userEmail, instanceName) =>
        email.instanceFailed(userEmail, instanceName)
      ).catch(() => {});

      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    
    // CRITICAL: Upstash-specific settings to prevent stalling
    // Upstash has higher latency than regular Redis
    lockDuration: 600000, // 10 minutes - long enough for Terraform operations
    lockRenewTime: 60000, // Renew lock every 60 seconds
    stalledInterval: 120000, // Check for stalled jobs every 2 minutes (increased from default 30s)
    maxStalledCount: 3, // Allow more stalled retries
    
    // Settings for better Upstash compatibility
    settings: {
      // Increase the time before a job is considered stalled
      // lockDuration: 600000,
      // stalledInterval: 120000,
    },
    
    // Job completion settings
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 50,
    },
  }
);

async function handleCreate(
  job: Job<TerraformJobData>,
  executor: TerraformExecutor,
  instanceId: string,
  variables: Partial<TerraformVariables>
): Promise<void> {
  console.log(`🚀 Starting instance creation for ${instanceId}`);
  
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });
  
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }
  
  console.log('📦 Initializing Terraform workspace...');
  await job.updateProgress(10);
  
  const fullVariables: TerraformVariables = {
    instanceId,
    name: instance.name,
    size: instance.config.size,
    version: instance.config.version,
    region: instance.config.region,
    userId: instance.userId,
    ...variables,
  };
  
  await executor.initWorkspace(fullVariables);
  
  console.log('📝 Creating Terraform plan...');
  await job.updateProgress(30);
  await updateInstanceStatus(instanceId, 'PROVISIONING');
  await executor.plan();
  console.log('✅ Plan created successfully');
  
  console.log('🔨 Applying infrastructure (this may take 5-10 minutes)...');
  await job.updateProgress(50);
  await updateInstanceStatus(instanceId, 'STARTING');
  
  const outputs = await Promise.race([
    executor.apply(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Terraform apply timeout')), 900000) // 15 min timeout
    )
  ]);
  
  console.log('✅ Infrastructure created:', outputs);
  await job.updateProgress(80);
  
  const instanceUrl = `http://${outputs.instance_url?.value || outputs.alb_dns_name?.value}`;
  console.log('📝 Updating database with URL:', instanceUrl);
  
  const updateData: Prisma.InstanceUpdateInput = {
    status: 'RUNNING',
    access: {
      set: {
        url: instanceUrl,
        webhookUrl: `${instanceUrl}/webhook`,
        adminUsername: instance.access?.adminUsername || 'admin@example.com',
        adminPasswordHash: instance.access?.adminPasswordHash || '',
        apiKey: instance.access?.apiKey || '',
        sshKeyName: instance.access?.sshKeyName || null,
      }
    },
    awsResources: {
      set: {
        ecsCluster: outputs.ecs_cluster_name?.value || null,
        ecsService: outputs.ecs_service_name?.value || null,
        ecsTaskArn: null,
        albDnsName: outputs.instance_url?.value || outputs.alb_dns_name?.value || null,
        albArn: null,
        targetGroupArn: null,
        rdsEndpoint: outputs.database_endpoint?.value || null,
        rdsInstanceId: null,
        vpcId: outputs.vpc_id?.value || null,
        subnetIds: [],
        securityGroupId: null,
        s3BucketName: null,
      }
    },
    terraformOutputs: outputs as Prisma.JsonValue,
    startedAt: new Date(),
  };
  
  await prisma.instance.update({
    where: { id: instanceId },
    data: updateData,
  });
  
  await job.updateProgress(100);
  console.log(`✅ Instance ${instanceId} provisioned successfully!`);
  console.log(`🌐 Access URL: ${instanceUrl}`);
}

async function handleDestroy(
  executor: TerraformExecutor,
  instanceId: string
): Promise<void> {
  console.log(`🗑️  Destroying instance ${instanceId}`);
  await updateInstanceStatus(instanceId, 'DESTROYING');
  await executor.destroy();
  
  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: 'STOPPED',
      deletedAt: new Date(),
    },
  });

  notifyInstanceOwner(instanceId, (userEmail, instanceName) =>
    email.instanceDeleted(userEmail, instanceName)
  ).catch(() => {});

  console.log(`✅ Instance ${instanceId} destroyed`);
}

async function handleUpdate(instanceId: string): Promise<void> {
  await updateInstanceStatus(instanceId, 'UPDATING');
  console.log('⚠️  Update not yet implemented for instance:', instanceId);
}

async function handleRestart(
  executor: TerraformExecutor,
  instanceId: string
): Promise<void> {
  await updateInstanceStatus(instanceId, 'STOPPING');
  console.log('⚠️  Restart not yet implemented for instance:', instanceId);
}

async function handleScale(instanceId: string): Promise<void> {
  await updateInstanceStatus(instanceId, 'UPDATING');
  console.log('⚠️  Scale not yet implemented for instance:', instanceId);
}

// ============================================================================
// Local Docker Handlers
// ============================================================================

async function handleDockerCreate(
  job: Job<TerraformJobData>,
  provisioner: DockerProvisioner,
  instanceId: string,
): Promise<void> {
  console.log(`🐳 [LOCAL DOCKER] Starting instance creation for ${instanceId}`);

  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  await job.updateProgress(10);
  await updateInstanceStatus(instanceId, 'PROVISIONING');

  console.log('🐳 [LOCAL DOCKER] Starting Docker containers...');
  await job.updateProgress(30);
  await updateInstanceStatus(instanceId, 'STARTING');

  const { url, port } = await provisioner.create({
    version: instance.config.version || 'latest',
    size: instance.config.size || 'SMALL',
  });

  await job.updateProgress(80);
  console.log(`🐳 [LOCAL DOCKER] Instance running at ${url}`);

  const updateData: Prisma.InstanceUpdateInput = {
    status: 'RUNNING',
    access: {
      set: {
        url,
        webhookUrl: `${url}/webhook`,
        adminUsername: instance.access?.adminUsername || 'admin@example.com',
        adminPasswordHash: instance.access?.adminPasswordHash || '',
        apiKey: instance.access?.apiKey || '',
        sshKeyName: null,
      }
    },
    awsResources: {
      set: {
        ecsCluster: 'docker-local',
        ecsService: `n8n-${instanceId}`,
        ecsTaskArn: null,
        albDnsName: `localhost:${port}`,
        albArn: null,
        targetGroupArn: null,
        rdsEndpoint: 'docker-internal-postgres',
        rdsInstanceId: null,
        vpcId: 'docker-local',
        subnetIds: [],
        securityGroupId: null,
        s3BucketName: null,
      }
    },
    terraformOutputs: {
      provider: 'local-docker',
      port,
      projectName: `n8n-${instanceId}`,
    } as unknown as Prisma.JsonValue,
    startedAt: new Date(),
  };

  await prisma.instance.update({
    where: { id: instanceId },
    data: updateData,
  });

  await job.updateProgress(100);
  console.log(`🐳 [LOCAL DOCKER] Instance ${instanceId} provisioned at ${url}`);
}

async function handleDockerDestroy(
  provisioner: DockerProvisioner,
  instanceId: string,
): Promise<void> {
  console.log(`🐳 [LOCAL DOCKER] Destroying instance ${instanceId}`);
  await updateInstanceStatus(instanceId, 'DESTROYING');

  await provisioner.destroy();

  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: 'STOPPED',
      deletedAt: new Date(),
    },
  });
  notifyInstanceOwner(instanceId, (userEmail, instanceName) =>
    email.instanceDeleted(userEmail, instanceName)
  ).catch(() => {});

  console.log(`🐳 [LOCAL DOCKER] Instance ${instanceId} destroyed`);
}

async function handleDockerRestart(
  provisioner: DockerProvisioner,
  instanceId: string,
): Promise<void> {
  console.log(`🐳 [LOCAL DOCKER] Restarting instance ${instanceId}`);
  await updateInstanceStatus(instanceId, 'STARTING');

  const { url } = await provisioner.restart();

  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: 'RUNNING',
      access: {
        set: {
          url,
          webhookUrl: `${url}/webhook`,
          adminUsername: instance?.access?.adminUsername || 'admin@example.com',
          adminPasswordHash: instance?.access?.adminPasswordHash || '',
          apiKey: instance?.access?.apiKey || '',
          sshKeyName: null,
        }
      },
    },
  });

  console.log(`🐳 [LOCAL DOCKER] Instance ${instanceId} restarted at ${url}`);
}

// ============================================================================
// EC2 Docker Handlers
// ============================================================================

async function handleEC2Create(
  job: Job<TerraformJobData>,
  provisioner: EC2Provisioner,
  instanceId: string,
): Promise<void> {
  console.log(`☁️  [EC2 DOCKER] Starting instance creation for ${instanceId}`);

  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  await job.updateProgress(10);
  await updateInstanceStatus(instanceId, 'PROVISIONING');

  console.log('☁️  [EC2 DOCKER] Creating CloudFormation stack...');
  await job.updateProgress(30);
  await updateInstanceStatus(instanceId, 'STARTING');

  const outputs = await Promise.race([
    provisioner.create({
      name: instance.name,
      version: instance.config.version || 'latest',
      size: instance.config.size || 'SMALL',
      region: instance.config.region,
      domainName: (instance.config.environment as Record<string, string> | undefined)?.DOMAIN_NAME,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('EC2 provisioning timeout')), 900000)
    ),
  ]);

  await job.updateProgress(80);
  const instanceUrl = outputs.n8nUrl;
  console.log(`☁️  [EC2 DOCKER] Instance running at ${instanceUrl}`);

  const updateData: Prisma.InstanceUpdateInput = {
    status: 'RUNNING',
    access: {
      set: {
        url: instanceUrl,
        webhookUrl: `${instanceUrl}/webhook`,
        adminUsername: instance.access?.adminUsername || 'admin@example.com',
        adminPasswordHash: instance.access?.adminPasswordHash || '',
        apiKey: instance.access?.apiKey || '',
        sshKeyName: instance.access?.sshKeyName || null,
      },
    },
    awsResources: {
      set: {
        ecsCluster: null,
        ecsService: null,
        ecsTaskArn: outputs.ec2InstanceId,
        albDnsName: outputs.instancePublicIP,
        albArn: null,
        targetGroupArn: null,
        rdsEndpoint: 'docker-internal-postgres',
        rdsInstanceId: null,
        vpcId: outputs.vpcId || null,
        subnetIds: [],
        securityGroupId: outputs.securityGroupId || null,
        s3BucketName: outputs.backupBucketName || null,
      },
    },
    terraformOutputs: {
      provider: 'ec2-docker',
      stackName: `n8n-ec2-${instanceId}`,
      ...outputs,
    } as unknown as Prisma.JsonValue,
    startedAt: new Date(),
  };

  await prisma.instance.update({
    where: { id: instanceId },
    data: updateData,
  });

  await job.updateProgress(100);
  console.log(`☁️  [EC2 DOCKER] Instance ${instanceId} provisioned at ${instanceUrl}`);
}

async function handleEC2Destroy(
  provisioner: EC2Provisioner,
  instanceId: string,
): Promise<void> {
  console.log(`☁️  [EC2 DOCKER] Destroying instance ${instanceId}`);
  await updateInstanceStatus(instanceId, 'DESTROYING');

  await provisioner.destroy();

  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: 'STOPPED',
      deletedAt: new Date(),
    },
  });
  notifyInstanceOwner(instanceId, (userEmail, instanceName) =>
    email.instanceDeleted(userEmail, instanceName)
  ).catch(() => {});

  console.log(`☁️  [EC2 DOCKER] Instance ${instanceId} destroyed`);
}

async function handleEC2Restart(instanceId: string): Promise<void> {
  console.log(`☁️  [EC2 DOCKER] Restart not yet implemented for instance: ${instanceId}`);
  await updateInstanceStatus(instanceId, 'RUNNING');
}

// ============================================================================
// Email notification helper
// ============================================================================

async function notifyInstanceOwner(
  instanceId: string,
  sendFn: (userEmail: string, instanceName: string) => Promise<void>
): Promise<void> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
    select: { name: true, userId: true },
  });
  if (!instance) return;

  const user = await prisma.user.findUnique({
    where: { id: instance.userId },
    select: { email: true },
  });
  if (!user?.email) return;

  await sendFn(user.email, instance.name);
}