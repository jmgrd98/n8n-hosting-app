// lib/queue/workers/index.ts
import { terraformWorker } from './terraform.worker';
import { redis } from '../client';

export async function startWorkers() {
  console.log('🚀 Starting queue workers...');
  
  // Test Redis connection
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
  
  terraformWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });
  
  terraformWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });
  
  terraformWorker.on('active', (job) => {
    console.log(`🔄 Processing job ${job.id}`);
  });
  
  terraformWorker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });
  
  console.log('✅ Workers started and listening for jobs');
  
  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, closing worker...');
    await terraformWorker.close();
    await redis.quit();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('⚠️  SIGINT received, closing worker...');
    await terraformWorker.close();
    await redis.quit();
    process.exit(0);
  });
}

// Start workers if this is the main module
if (require.main === module) {
  startWorkers().catch((error) => {
    console.error('Failed to start workers:', error);
    process.exit(1);
  });
}