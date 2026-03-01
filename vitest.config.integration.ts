import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    include: ['__tests__/integration/**/*.integration.test.ts'],
    exclude: ['node_modules', '.next'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_REGION: 'us-east-1',
      AWS_ENDPOINT_URL: 'http://localhost:4566',
      TF_STATE_BUCKET: 'n8n-terraform-state-test',
      TERRAFORM_STATE_BUCKET: 'n8n-terraform-state-test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6380',
    },
  },
});
