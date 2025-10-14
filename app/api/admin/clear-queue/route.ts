// app/api/admin/clear-queue/route.ts
import { NextResponse } from 'next/server';
import { Queue, Job } from 'bullmq';
import { connection } from '@/lib/queue/client';
import { TerraformJobData } from '@/types/infrastructure';

interface ObliterateRequest {
  obliterate?: boolean;
}

interface JobSummary {
  id: string | undefined;
  data: TerraformJobData;
  failedReason?: string;
}

export async function POST(request: Request) {
  try {
    // Optional: Add authentication here
    // const session = await getServerSession();
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const queue = new Queue<TerraformJobData>('terraform-jobs', { connection });
    
    // Get all job counts before cleanup
    const beforeCounts = await queue.getJobCounts();
    console.log('Job counts before cleanup:', beforeCounts);
    
    // Clean all failed and completed jobs
    await queue.clean(0, 1000, 'failed');
    await queue.clean(0, 1000, 'completed');
    
    // Drain waiting jobs (removes them)
    await queue.drain();
    
    // Get obliterate option if requested
    let requestBody: ObliterateRequest = {};
    try {
      requestBody = await request.json();
    } catch {
      // Request body is optional
    }
    
    if (requestBody.obliterate) {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error cleaning queue:', error);
    return NextResponse.json(
      { error: 'Failed to clean queue', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const queue = new Queue<TerraformJobData>('terraform-jobs', { connection });
    
    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting(0, 10);
    const failed = await queue.getFailed(0, 10);
    
    await queue.close();
    
    const formatJob = (job: Job<TerraformJobData>): JobSummary => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
    });
    
    return NextResponse.json({
      counts,
      waiting: waiting.map(formatJob),
      failed: failed.map(formatJob),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error inspecting queue:', error);
    return NextResponse.json(
      { error: 'Failed to inspect queue', details: errorMessage },
      { status: 500 }
    );
  }
}