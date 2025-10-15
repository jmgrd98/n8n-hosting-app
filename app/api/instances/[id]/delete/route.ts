// app/api/instances/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, updateInstanceStatus } from '@/lib/database';
import { provisioningQueue } from '@/lib/queue/index';
import type { TerraformJobData } from '@/types/infrastructure';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Verify instance exists and belongs to user
    const instance = await getInstanceById(id);
    
    if (!instance || instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }
    
    // Can only delete instances that are RUNNING, STOPPED, or FAILED
    const deletableStatuses = ['RUNNING', 'STOPPED', 'FAILED'];
    if (!deletableStatuses.includes(instance.status)) {
      return NextResponse.json(
        { error: `Cannot delete instance with status: ${instance.status}` },
        { status: 400 }
      );
    }
    
    // Update status to DESTROYING immediately
    await updateInstanceStatus(id, 'DESTROYING');
    
    // Queue the destroy job
    const jobData: TerraformJobData = {
      action: 'destroy',
      instanceId: id,
      variables: {},
    };
    
    const job = await provisioningQueue.add('terraform-destroy', jobData, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    console.log(`🗑️  Queued destroy job ${job.id} for instance ${id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Instance deletion initiated. This may take several minutes.',
      jobId: job.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to delete instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance', details: errorMessage },
      { status: 500 }
    );
  }
}