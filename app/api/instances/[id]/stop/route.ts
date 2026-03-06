// app/api/instances/[id]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, updateInstanceStatus } from '@/lib/database';
import { queueTerraformJob } from '@/lib/queue/jobs';
import { requireInstancePermission, Permission } from '@/lib/auth/permissions';


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
    
    const permDenied = await requireInstancePermission(
      session.user.id, session.user.role, id, instance.userId, Permission.START_STOP_INSTANCE
    );
    if (permDenied) return permDenied;

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
      action: 'stop',
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