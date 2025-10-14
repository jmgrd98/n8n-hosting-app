// lib/queue/workers/index.ts
import { terraformWorker } from './terraform.worker';
import { redis } from '../client';

export async function startWorkers() {
  console.log('🚀 Starting queue workers...');
  console.log('📍 Environment:', process.env.NODE_ENV);
  console.log('📍 Redis Host:', process.env.REDIS_HOST);
  
  // Test Redis connection with retry
  let connected = false;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (!connected && attempts < maxAttempts) {
    try {
      attempts++;
      await redis.ping();
      console.log('✅ Redis connection successful');
      connected = true;
    } catch (error) {
      console.error(`❌ Redis connection attempt ${attempts}/${maxAttempts} failed:`, error);
      if (attempts < maxAttempts) {
        const delay = attempts * 2000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to Redis after multiple attempts');
        process.exit(1);
      }
    }
  }
  
  // Worker event handlers
  terraformWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });
  
  terraformWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });
  
  terraformWorker.on('active', (job) => {
    console.log(`🔄 Processing job ${job.id} - Action: ${job.data.action}`);
  });
  
  terraformWorker.on('error', (err) => {
    // Don't exit on connection errors, let it reconnect
    if (err.message.includes('ECONNRESET') || err.message.includes('EPIPE')) {
      console.warn('⚠️  Worker connection error (will reconnect):', err.message);
    } else {
      console.error('❌ Worker error:', err);
    }
  });
  
  terraformWorker.on('stalled', (jobId) => {
    console.warn(`⚠️  Job ${jobId} stalled`);
  });
  
  console.log('✅ Workers started and listening for jobs');
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`⚠️  ${signal} received, closing worker gracefully...`);
    try {
      await terraformWorker.close();
      await redis.quit();
      console.log('👋 Worker closed cleanly');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors without exiting
  process.on('uncaughtException', (error) => {
    if (error.message.includes('ECONNRESET') || error.message.includes('EPIPE')) {
      console.warn('⚠️  Connection error (will reconnect):', error.message);
    } else {
      console.error('💥 Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Start workers if this is the main module
if (require.main === module) {
  startWorkers().catch((error) => {
    console.error('Failed to start workers:', error);
    process.exit(1);
  });
}