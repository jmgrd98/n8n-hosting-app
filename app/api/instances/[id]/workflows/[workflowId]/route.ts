import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';

// DELETE - Delete workflow from n8n instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: instanceId, workflowId } = await params;
    const apiKeyId = request.headers.get('X-API-Key-ID');

    console.log('Deleting workflow:', workflowId, 'from instance:', instanceId);

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API Key ID required' }, { status: 400 });
    }

    // Get instance with API key (removed deletedAt check)
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId: session.user.id,
      },
      include: {
        apiKeys: {
          where: { id: apiKeyId },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    if (instance.apiKeys.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const apiKey = instance.apiKeys[0].key;
    const n8nUrl = instance.access?.url;

    if (!n8nUrl) {
      return NextResponse.json({ error: 'Instance URL not available' }, { status: 400 });
    }

    // Delete workflow from n8n
    const n8nResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    });

    if (!n8nResponse.ok) {
      const errorData = await n8nResponse.json().catch(() => ({}));
      console.error('n8n API error:', n8nResponse.status, errorData);
      throw new Error(errorData.message || 'Failed to delete workflow from n8n');
    }

    console.log('Workflow deleted successfully');

    // Update API key last used
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsed: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
      { error: error.message || 'Failed to delete workflow' },
      { status: 500 }
    );
    }
    
  }
}

// GET - Get single workflow details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: instanceId, workflowId } = await params;
    const apiKeyId = request.headers.get('X-API-Key-ID');

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API Key ID required' }, { status: 400 });
    }

    // Get instance with API key
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId: session.user.id,
      },
      include: {
        apiKeys: {
          where: { id: apiKeyId },
        },
      },
    });

    if (!instance || instance.apiKeys.length === 0) {
      return NextResponse.json({ error: 'Instance or API key not found' }, { status: 404 });
    }

    const apiKey = instance.apiKeys[0].key;
    const n8nUrl = instance.access?.url;

    if (!n8nUrl) {
      return NextResponse.json({ error: 'Instance URL not available' }, { status: 400 });
    }

    // Get workflow from n8n
    const n8nResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    });

    if (!n8nResponse.ok) {
      throw new Error('Failed to fetch workflow from n8n');
    }

    const workflow = await n8nResponse.json();

    return NextResponse.json({ workflow });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching workflow:', error);
return NextResponse.json(
      { error: error.message || 'Failed to fetch workflow' },
      { status: 500 }
    );
    }
    
  }
}