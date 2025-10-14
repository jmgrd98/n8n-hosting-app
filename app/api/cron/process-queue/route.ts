// app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { connection } from '@/lib/queue/client';
import { TerraformExecutor } from '@/lib/terraform/executor';
import { updateInstanceStatus, prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';
import { TerraformJobData } from '@/types/infrastructure';

// Verify cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queue = new Queue<TerraformJobData>('terraform-jobs', { connection });
    
    // Get waiting jobs
    const waitingJobs = await queue.getWaiting(0, 5); // Process up to 5 jobs
    
    if (waitingJobs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No jobs to process',
        processed: 0 
      });
    }

    console.log(`Processing ${waitingJobs.length} jobs`);
    
    // Process jobs
    const results = await Promise.allSettled(
      waitingJobs.map(job => processJob(job))
    );

    const processed = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: waitingJobs.length,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}

async function processJob(job: any) {
  const { action, instanceId, variables } = job.data;
  const executor = new TerraformExecutor(instanceId);
  
  try {
    console.log(`Processing job ${job.id} for instance ${instanceId}`);
    
    switch (action) {
      case 'create':
        await handleCreate(executor, instanceId, variables);
        break;
      case 'destroy':
        await handleDestroy(executor, instanceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    await job.moveToCompleted('done', true);
    console.log(`Job ${job.id} completed`);
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await job.moveToFailed(error as Error, true);
    await updateInstanceStatus(instanceId, 'FAILED');
    throw error;
  }
}

async function handleCreate(
  executor: TerraformExecutor,
  instanceId: string,
  variables: any
) {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });
  
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }
  
  const fullVariables = {
    instanceId,
    name: instance.name,
    size: instance.config.size,
    version: instance.config.version,
    region: instance.config.region,
    userId: instance.userId,
    ...variables,
  };
  
  await executor.initWorkspace(fullVariables);
  await updateInstanceStatus(instanceId, 'PROVISIONING');
  await executor.plan();
  await updateInstanceStatus(instanceId, 'STARTING');
  
  const outputs = await executor.apply();
  
  const instanceUrl = `http://${outputs.instance_url?.value || outputs.alb_dns_name?.value}`;
  
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
  
  console.log(`Instance ${instanceId} provisioned successfully!`);
}

async function handleDestroy(
  executor: TerraformExecutor,
  instanceId: string
) {
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