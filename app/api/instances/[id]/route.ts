// app/api/instances/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, deleteInstance } from '@/lib/database';
import { requireInstancePermission, Permission } from '@/lib/auth/permissions';

// GET /api/instances/[id] - Get instance details
export async function GET(
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
;
    console.log('Fetching instance:', id, 'for user:', session.user.id);
    
    const instance = await getInstanceById(id);
    
    if (!instance) {
      console.log('Instance not found:', id);
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }
    
    // Verify the instance belongs to the user (or user is ADMIN)
    if (instance.userId !== session.user.id && session.user.role !== 'ADMIN') {
      console.log('Instance does not belong to user:', instance.userId, '!==', session.user.id);
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ instance });
  } catch (error) {
    console.error('Failed to fetch instance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instance' },
      { status: 500 }
    );
  }
}

// DELETE /api/instances/[id] - Delete instance
export async function DELETE(
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
    
    // Verify instance exists
    const instance = await getInstanceById(id);

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const permDenied = await requireInstancePermission(
      session.user.id, session.user.role, id, instance.userId, Permission.DELETE_INSTANCE
    );
    if (permDenied) return permDenied;

    // Delete the instance
    await deleteInstance(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance' },
      { status: 500 }
    );
  }
}