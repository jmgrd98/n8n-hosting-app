// lib/queue/workers/index.ts
import { terraformWorker } from './terraform.worker';

export async function startWorkers() {
  console.log('Starting queue workers...');
  
  terraformWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });
  
  terraformWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
  
  console.log('Workers started');
}

// Start workers if this is the main module
if (require.main === module) {
  startWorkers();
}