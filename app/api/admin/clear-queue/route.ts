// app/api/admin/clear-queue/route.ts
import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { connection } from '@/lib/queue/client';

export async function POST(request: Request) {
  try {
    // Optional: Add authentication here
    // const session = await getServerSession();
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const queue = new Queue('terraform-jobs', { connection });
    
    // Get all job counts before cleanup
    const beforeCounts = await queue.getJobCounts();
    console.log('Job counts before cleanup:', beforeCounts);
    
    // Clean all failed and completed jobs
    await queue.clean(0, 1000, 'failed');
    await queue.clean(0, 1000, 'completed');
    
    // Drain waiting jobs (removes them)
    await queue.drain();
    
    // Get obliterate option if requested
    const { obliterate } = await request.json().catch(() => ({}));
    
    if (obliterate) {
      // Nuclear option: completely obliterate the queue
      await queue.obliterate({ force: true });
      console.log('Queue obliterated');
    }
    
    // Get counts after cleanup
    const afterCounts = await queue.getJobCounts();
    console.log('Job counts after cleanup:', afterCounts);
    
    await queue.close();
    
    return NextResponse.json({
      success: true,
      message: 'Queue cleaned successfully',
      before: beforeCounts,
      after: afterCounts,
    });
  } catch (error: any) {
    console.error('Error cleaning queue:', error);
    return NextResponse.json(
      { error: 'Failed to clean queue', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const queue = new Queue('terraform-jobs', { connection });
    
    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting(0, 10);
    const failed = await queue.getFailed(0, 10);
    
    await queue.close();
    
    return NextResponse.json({
      counts,
      waiting: waiting.map(j => ({ id: j.id, data: j.data, failedReason: j.failedReason })),
      failed: failed.map(j => ({ id: j.id, data: j.data, failedReason: j.failedReason })),
    });
  } catch (error: any) {
    console.error('Error inspecting queue:', error);
    return NextResponse.json(
      { error: 'Failed to inspect queue', details: error.message },
      { status: 500 }
    );
  }
}