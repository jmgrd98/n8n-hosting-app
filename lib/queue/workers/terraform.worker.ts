import { Worker, Job } from 'bullmq';
import { connection } from '../client';
import { TerraformExecutor } from '@/lib/terraform/executor';
import { updateInstanceStatus, prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';
import { TerraformJobData, TerraformVariables } from '@/types/infrastructure';
// Import TerraformJobData, TerraformOutputs from types above

export const terraformWorker = new Worker<TerraformJobData>(
  'terraform-jobs',
  async (job: Job<TerraformJobData>) => {
    console.log('📋 Processing terraform job:', {
      id: job.id,
      name: job.name,
      instanceId: job.data.instanceId
    });
    
    const { action, instanceId, variables } = job.data;
    const executor = new TerraformExecutor(instanceId);
    
    try {
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
          
        default:
          // TypeScript ensures this is never reached
          const exhaustiveCheck: never = action;
          throw new Error(`Unknown action: ${exhaustiveCheck}`);
      }
    } catch (error) {
      console.error(`Terraform job failed for ${instanceId}:`, error);
      await updateInstanceStatus(instanceId, 'FAILED');
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
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
  console.log('Plan created successfully');
  
  console.log('🔨 Applying infrastructure (this may take 5-10 minutes)...');
  await job.updateProgress(50);
  await updateInstanceStatus(instanceId, 'STARTING');
  
  const outputs = await Promise.race([
    executor.apply(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Terraform apply timeout')), 600000)
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
  await updateInstanceStatus(instanceId, 'DESTROYING');
  await executor.destroy();
  
  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      status: 'STOPPED',
      deletedAt: new Date(),
    },
  });
}

async function handleUpdate(
  // executor: TerraformExecutor,
  instanceId: string,
  // variables: Partial<TerraformVariables>
): Promise<void> {
  await updateInstanceStatus(instanceId, 'UPDATING');
  // Implement update logic
  console.log('Update not yet implemented');
}

async function handleRestart(
  executor: TerraformExecutor,
  instanceId: string
): Promise<void> {
  await updateInstanceStatus(instanceId, 'STOPPING');
  // Implement restart logic
  console.log('Restart not yet implemented');
}

async function handleScale(
  // executor: TerraformExecutor,
  instanceId: string,
  // variables: Partial<TerraformVariables>
): Promise<void> {
  await updateInstanceStatus(instanceId, 'UPDATING');
  // Implement scale logic
  console.log('Scale not yet implemented');
}