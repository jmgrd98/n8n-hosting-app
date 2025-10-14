// lib/queue/workers/index.ts
import { terraformWorker } from './terraform.worker';
import { redis } from '../client';

export async function startWorkers() {
  console.log('🚀 Starting queue workers...');
  console.log('📍 Environment:', process.env.NODE_ENV);
  console.log('📍 Redis config:', process.env.REDIS_URL ? 'Using REDIS_URL' : `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  
  // Wait for Redis to be ready with retries
  let connected = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!connected && attempts < maxAttempts) {
    try {
      attempts++;
      const result = await redis.ping();
      if (result === 'PONG') {
        console.log('✅ Redis connection verified with PING/PONG');
        connected = true;
      }
    } catch (error: any) {
      console.error(`❌ Redis connection attempt ${attempts}/${maxAttempts} failed:`, error.message);
      if (attempts < maxAttempts) {
        const delay = attempts * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to Redis after multiple attempts');
        console.error('Please check your REDIS_URL or REDIS_HOST/PORT/PASSWORD');
        process.exit(1);
      }
    }
  }
  
  // Set a simple interval to keep connection alive
  const keepAliveInterval = setInterval(async () => {
    try {
      await redis.ping();
    } catch (error) {
      // Ping will auto-reconnect via reconnectOnError
    }
  }, 30000); // Ping every 30 seconds
  
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
    // Don't log EPIPE/ECONNRESET as errors - they auto-reconnect
    if (!err.message.includes('EPIPE') && !err.message.includes('ECONNRESET')) {
      console.error('❌ Worker error:', err.message);
    }
  });
  
  terraformWorker.on('stalled', (jobId) => {
    console.warn(`⚠️  Job ${jobId} stalled, will retry`);
  });
  
  console.log('✅ Workers started and listening for jobs on queue: terraform-jobs');
  console.log('🎯 Ready to process Terraform operations');
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`⚠️  ${signal} received, closing worker gracefully...`);
    clearInterval(keepAliveInterval);
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
  
  // Handle errors without crashing
  process.on('uncaughtException', (error) => {
    if (error.message.includes('EPIPE') || error.message.includes('ECONNRESET')) {
      // Connection will auto-reconnect, don't crash
      return;
    }
    console.error('💥 Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
  });
}

// Start workers if this is the main module
if (require.main === module) {
  startWorkers().catch((error) => {
    console.error('💥 Failed to start workers:', error);
    process.exit(1);
  });
}