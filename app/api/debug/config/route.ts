// app/api/debug/config/route.ts
import { NextResponse } from 'next/server';
import { isQueueAvailable } from '@/lib/queue/client';

export async function GET() {
  return NextResponse.json({
    USE_MOCK_PROVISIONING: process.env.USE_MOCK_PROVISIONING,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    AWS_REGION: process.env.AWS_REGION || 'NOT SET',
    REDIS_HOST: process.env.REDIS_HOST || 'NOT SET',
    REDIS_PORT: process.env.REDIS_PORT || 'NOT SET',
    QUEUE_AVAILABLE: isQueueAvailable,
    NODE_ENV: process.env.NODE_ENV,
  });
}