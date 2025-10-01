// app/api/instances/[id]/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, createBackup } from '@/lib/database';
import { queueBackupJob } from '@/lib/queue/jobs';

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
    
    // Await the params
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
        { error: 'Instance must be running to create backup' },
        { status: 400 }
      );
    }
    
    // Create backup record
    const backup = await createBackup(id, 'MANUAL');
    
    // Queue backup job
    await queueBackupJob({
      instanceId: id,
      type: 'MANUAL',
    });
    
    return NextResponse.json({ 
      message: 'Backup initiated',
      backupId: backup.id 
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}