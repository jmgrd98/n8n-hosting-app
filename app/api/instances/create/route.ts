// app/api/instances/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createInstanceRecord } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { queueTerraformJob } from '@/lib/queue/jobs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { config } = await request.json();
    const userId = session.user.id;
    
    // Create instance record
    const instance = await createInstanceRecord({
      userId,
      status: 'PROVISIONING',
      config
    });
    
    // Check if we should use real provisioning
    const useRealProvisioning = 
      process.env.USE_MOCK_PROVISIONING !== 'true' && 
      process.env.AWS_ACCESS_KEY_ID && 
      process.env.AWS_SECRET_ACCESS_KEY;
    
    console.log('Provisioning mode:', useRealProvisioning ? 'REAL AWS' : 'MOCK');
    
    if (useRealProvisioning) {
      try {
        // Try to queue real Terraform job
        const job = await queueTerraformJob({
          action: 'create',
          instanceId: instance.id,
          variables: {
            instanceId: instance.id,
            userId,
            version: config.version || 'latest',
            size: config.size || 'small',
            region: config.region || 'us-east-1'
          }
        });
        
        if (job) {
          console.log(`✅ Queued Terraform job: ${job.id} for instance ${instance.id}`);
        } else {
          console.log('❌ Failed to queue job, falling back to mock');
          throw new Error('Queue not available');
        }
      } catch (error) {
        console.error('Failed to queue terraform job:', error);
        // Fallback to mock
        triggerMockProvisioning(instance.id);
      }
    } else {
      // Use mock provisioning
      triggerMockProvisioning(instance.id);
    }
    
    return NextResponse.json({ 
      instanceId: instance.id,
      status: 'provisioning',
      instance 
    });
  } catch (error) {
    console.error('Failed to create instance:', error);
    return NextResponse.json(
      { error: 'Failed to create instance' },
      { status: 500 }
    );
  }
}

function triggerMockProvisioning(instanceId: string) {
  console.log('🎭 Using mock provisioning for instance:', instanceId);
  setTimeout(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/instances/${instanceId}/provision`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error triggering mock provision:', error);
    }
  }, 2000);
}