// app/api/instances/[id]/stop/route.ts
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
        { error: 'Instance must be running to stop' },
        { status: 400 }
      );
    }
    
    // Update status to stopping
    await updateInstanceStatus(id, 'STOPPING');
    
    // Queue stop job
    await queueTerraformJob({
      action: 'restart',
      instanceId: id,
      variables: {
        instanceId: id,
      },
    });
    
    return NextResponse.json({ 
      message: 'Instance is stopping',
      status: 'STOPPING' 
    });
  } catch (error) {
    console.error('Failed to stop instance:', error);
    return NextResponse.json(
      { error: 'Failed to stop instance' },
      { status: 500 }
    );
  }
}