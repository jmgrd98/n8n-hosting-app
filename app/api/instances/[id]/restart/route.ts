// app/api/instances/[id]/restart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, updateInstanceStatus } from '@/lib/database';
import { queueTerraformJob } from '@/lib/queue/jobs';


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
    
    const instance = await getInstanceById(id);
    
    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }
    
    if (instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    if (instance.status !== 'RUNNING') {
      return NextResponse.json(
        { error: 'Instance must be running to restart' },
        { status: 400 }
      );
    }
    
    // Update status
    await updateInstanceStatus(id, 'STARTING');
    
    // Queue restart job
    await queueTerraformJob({
      action: 'restart',
      instanceId: id,
      variables: {
        instanceId: id,
      },
    });
    
    return NextResponse.json({ 
      message: 'Instance is restarting',
      status: 'STARTING' 
    });
  } catch (error) {
    console.error('Failed to restart instance:', error);
    return NextResponse.json(
      { error: 'Failed to restart instance' },
      { status: 500 }
    );
  }
}