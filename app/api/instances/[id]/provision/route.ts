// app/api/instances/[id]/provision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateInstanceStatus, prisma } from '@/lib/database';


// This simulates the provisioning process
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Simulate provisioning steps
    console.log(`Starting mock provisioning for instance ${id}`);
    
    // Step 1: Update to STARTING
    await updateInstanceStatus(id, 'STARTING');
    
    // Step 2: Simulate infrastructure creation (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Update to RUNNING with mock URL and resources
    const mockUrl = `https://n8n-${id.slice(-8)}.demo.example.com`;
    
    // For MongoDB, we need to use 'set' for embedded documents
    await prisma.instance.update({
      where: { id },
      data: {
        status: 'RUNNING',
        access: {
          set: {  // Use 'set' instead of 'update'
            url: mockUrl,
            adminUsername: 'admin@example.com',
            adminPasswordHash: 'mock-password-hash',
            apiKey: `n8n_${id}`,
            webhookUrl: `${mockUrl}/webhook`,
          }
        },
        awsResources: {
          set: {  // Use 'set' for embedded documents
            ecsTaskArn: `arn:aws:ecs:us-east-1:123456789:task/mock-${id}`,
            ecsCluster: `cluster-${id}`,
            ecsService: `service-${id}`,
            albDnsName: `alb-${id}.us-east-1.elb.amazonaws.com`,
            vpcId: 'vpc-mock123',
            securityGroupId: 'sg-mock456',
            subnetIds: ['subnet-123', 'subnet-456'],
          }
        },
        startedAt: new Date(),
        latestMetrics: {
          set: {  // Use 'set' for embedded documents
            resources: {
              cpuUtilization: Math.random() * 30 + 10,
              memoryUsed: Math.random() * 512 + 256,
              memoryAvailable: 1024,
              storageUsed: Math.random() * 5 + 2,
              storageAvailable: 20,
            },
            n8nMetrics: {
              workflowCount: 0,
              executionCount: 0,
              failedExecutions: 0,
            },
            timestamp: new Date(),
          }
        }
      },
    });
    
    console.log(`Mock provisioning completed for instance ${id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Instance provisioned successfully',
      url: mockUrl
    });
  } catch (error) {
    console.error('Failed to provision instance:', error);
    
    // Update status to FAILED
    try {
      const { id } = await params;
      await updateInstanceStatus(id, 'FAILED');
    } catch (updateError) {
      console.error('Failed to update status to FAILED:', updateError);
    }
    
    return NextResponse.json(
      { error: 'Failed to provision instance' },
      { status: 500 }
    );
  }
}