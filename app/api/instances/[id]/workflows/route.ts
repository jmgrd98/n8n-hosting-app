import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';
import { Workflow } from '@prisma/client';
import { requireInstancePermission, Permission } from '@/lib/auth/permissions';

// GET - List all workflows from n8n instance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: instanceId } = await params;
    const apiKeyId = request.headers.get('X-API-Key-ID');

    console.log('Fetching workflows for instance:', instanceId);
    console.log('Using API Key ID:', apiKeyId);

    if (!apiKeyId) {
      return NextResponse.json({ error: 'API Key ID required in header' }, { status: 400 });
    }

    // Get instance with API key
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId },
      include: {
        apiKeys: {
          where: { id: apiKeyId },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const permDenied = await requireInstancePermission(
      session.user.id, session.user.role, instanceId, instance.userId, Permission.VIEW_WORKFLOWS
    );
    if (permDenied) return permDenied;

    if (instance.apiKeys.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const apiKey = instance.apiKeys[0].key;
    const n8nUrl = instance.access?.url;

    if (!n8nUrl) {
      return NextResponse.json({ error: 'Instance URL not available. Make sure instance is running.' }, { status: 400 });
    }

    console.log('Fetching workflows from n8n:', n8nUrl);

    // Fetch workflows from n8n API
    const n8nResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n API error:', n8nResponse.status, errorText);
      throw new Error(`n8n API error: ${n8nResponse.status} - ${errorText}`);
    }

    const n8nData = await n8nResponse.json();
    console.log('Fetched workflows count:', n8nData.data?.length || 0);
    
    // Transform n8n workflow data to match our interface
    const workflows = (n8nData.data || []).map((workflow: Workflow) => ({
      id: workflow.id,
      name: workflow.name,
      active: workflow.active || false,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      nodes: workflow.nodes || 0,
    }));

    return NextResponse.json({ workflows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch workflows from n8n';
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create workflow in n8n instance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: instanceId } = await params;
    const body = await request.json();
    const { workflow } = body;
    const apiKeyId = request.headers.get('X-API-Key-ID');

    console.log('Creating workflow in instance:', instanceId);
    console.log('Workflow name:', workflow?.name);
    console.log('Using API Key ID:', apiKeyId);

    if (!apiKeyId || !workflow) {
      return NextResponse.json(
        { error: 'API Key ID and workflow are required' },
        { status: 400 }
      );
    }

    // Validate workflow structure
    if (!workflow.name || !workflow.nodes || !workflow.connections) {
      return NextResponse.json(
        { error: 'Invalid workflow structure. Must include name, nodes, and connections.' },
        { status: 400 }
      );
    }

    // Get instance with API key
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId },
      include: {
        apiKeys: {
          where: { id: apiKeyId },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const permDenied = await requireInstancePermission(
      session.user.id, session.user.role, instanceId, instance.userId, Permission.CREATE_WORKFLOW
    );
    if (permDenied) return permDenied;

    if (instance.apiKeys.length === 0) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const apiKey = instance.apiKeys[0].key;
    const n8nUrl = instance.access?.url;

    if (!n8nUrl) {
      return NextResponse.json(
        { error: 'Instance URL not available. Make sure instance is running.' },
        { status: 400 }
      );
    }

    console.log('Posting workflow to n8n:', n8nUrl);

    const n8nWorkflow = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      ...(workflow.staticData && { staticData: workflow.staticData }),
    };

    console.log('Workflow payload:', JSON.stringify(n8nWorkflow, null, 2));

    // Create workflow in n8n via API
    const n8nResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(n8nWorkflow),
    });

    if (!n8nResponse.ok) {
      const errorData = await n8nResponse.json().catch(() => ({}));
      console.error('n8n API error:', n8nResponse.status, errorData);
      
      throw new Error(
        errorData.message || 
        errorData.error || 
        `Failed to create workflow in n8n (${n8nResponse.status})`
      );
    }

    const createdWorkflow = await n8nResponse.json();
    console.log('Workflow created successfully:', createdWorkflow.id);

    // Update API key last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsed: new Date() },
    });

    return NextResponse.json({
      success: true,
      workflow: {
        id: createdWorkflow.id,
        name: createdWorkflow.name,
        active: createdWorkflow.active,
        createdAt: createdWorkflow.createdAt,
        updatedAt: createdWorkflow.updatedAt,
      },
      message: `Workflow "${createdWorkflow.name}" created successfully!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create workflow in n8n';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Error creating workflow in n8n:', error);
    return NextResponse.json(
      { error: message, details: process.env.NODE_ENV === 'development' ? stack : undefined },
      { status: 500 }
    );
  }
}