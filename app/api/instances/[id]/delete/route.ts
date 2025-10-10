// app/api/instances/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, deleteInstance, updateInstanceStatus } from '@/lib/database';
import { TerraformExecutor } from '@/lib/terraform/executor';

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
    
    // Mark instance as being destroyed (soft delete)
    await deleteInstance(id);
    
    // Trigger AWS infrastructure deletion in the background
    // Don't await this - let it run asynchronously
    destroyInfrastructure(id).catch(error => {
      console.error(`Failed to destroy infrastructure for instance ${id}:`, error);
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Instance deletion initiated. This may take several minutes.'
    });
  } catch (error) {
    console.error('Failed to delete instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance' },
      { status: 500 }
    );
  }
}

async function destroyInfrastructure(instanceId: string) {
  try {
    console.log(`Starting infrastructure destruction for instance ${instanceId}`);
    
    // Update status to DESTROYING
    await updateInstanceStatus(instanceId, 'DESTROYING');
    
    // Execute Terraform destroy
    const terraform = new TerraformExecutor(instanceId);
    await terraform.destroy();
    
    console.log(`Successfully destroyed infrastructure for instance ${instanceId}`);
    
    // Update status to indicate complete deletion
    await updateInstanceStatus(instanceId, 'DELETED');
    
  } catch (error) {
    console.error(`Error destroying infrastructure for instance ${instanceId}:`, error);
    
    // Mark as failed
    await updateInstanceStatus(instanceId, 'FAILED');
    
    throw error;
  }
}