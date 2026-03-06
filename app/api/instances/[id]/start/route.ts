// app/api/instances/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, updateInstanceStatus } from '@/lib/database';
import { requireInstancePermission, Permission } from '@/lib/auth/permissions';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params; // Await params
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
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

    if (instance.status !== 'STOPPED') {
      return NextResponse.json(
        { error: 'Instance must be stopped to start' },
        { status: 400 }
      );
    }
    
    // Mock starting process
    await updateInstanceStatus(id, 'STARTING');
    
    setTimeout(async () => {
      await updateInstanceStatus(id, 'RUNNING');
    }, 3000);
    
    return NextResponse.json({ 
      message: 'Instance is starting',
      status: 'STARTING' 
    });
  } catch (error) {
    console.error('Failed to start instance:', error);
    return NextResponse.json(
      { error: 'Failed to start instance' },
      { status: 500 }
    );
  }
}