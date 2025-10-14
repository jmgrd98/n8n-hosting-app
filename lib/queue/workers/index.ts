// lib/queue/workers/index.ts
import { terraformWorker } from './terraform.worker';
import { redis } from '../client';

export async function startWorkers() {
  console.log('🚀 Starting queue workers...');
  console.log('📍 Environment:', process.env.NODE_ENV);
  console.log('📍 Redis: Upstash (serverless)');
  
  // Test Redis connection with retry
  let connected = false;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (!connected && attempts < maxAttempts) {
    try {
      attempts++;
      await redis.ping();
      console.log('✅ Redis connection verified with PING');
      connected = true;
    } catch (error: any) {
      // Ignore CLIENT SETINFO errors - these are expected with Upstash
      if (error.message && error.message.includes('CLIENT SETINFO')) {
        console.log('✅ Redis connected (Upstash compatibility mode)');
        connected = true;
        break;
      }
      
      console.error(`❌ Redis connection attempt ${attempts}/${maxAttempts} failed:`, error.message);
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
    console.log(`🔄 Processing job ${job.id} - Action: ${job.data.action} - Instance: ${job.data.instanceId}`);
  });
  
  terraformWorker.on('error', (err) => {
    // Suppress Upstash compatibility errors
    if (err.message.includes('CLIENT SETINFO') || 
        err.message.includes('Command timed out')) {
      return;
    }
    // Don't log EPIPE/ECONNRESET as errors - they auto-reconnect
    if (!err.message.includes('EPIPE') && !err.message.includes('ECONNRESET')) {
      console.error('❌ Worker error:', err.message);
    }
  });
  
  terraformWorker.on('stalled', (jobId) => {
    console.warn(`⚠️  Job ${jobId} stalled, will retry`);
  });
  
  console.log('✅ Worker started successfully');
  console.log('🎯 Listening for jobs on queue: terraform-jobs');
  console.log('⏳ Waiting for instance creation requests...');
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`⚠️  ${signal} received, closing worker gracefully...`);
    try {
      await terraformWorker.close();
      await redis.quit();
      console.log('👋 Worker closed cleanly');
      process.exit(0);
    } catch (error: any) {
      // Ignore shutdown errors
      if (!error.message.includes('Connection is closed')) {
        console.error('Error during shutdown:', error);
      }
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle errors without crashing
  process.on('uncaughtException', (error) => {
    // Ignore Upstash compatibility errors
    if (error.message.includes('EPIPE') || 
        error.message.includes('ECONNRESET') ||
        error.message.includes('CLIENT SETINFO') ||
        error.message.includes('Command timed out')) {
      return;
    }
    console.error('💥 Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason: any, promise) => {
    // Ignore Upstash compatibility errors
    if (reason && reason.message && 
        (reason.message.includes('CLIENT SETINFO') || 
         reason.message.includes('Command timed out'))) {
      return;
    }
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