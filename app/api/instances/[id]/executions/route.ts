// app/api/instances/[id]/executions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API Key ID from header
    const apiKeyId = request.headers.get('X-API-Key-ID');
    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'API Key ID required in header' },
        { status: 400 }
      );
    }

    // Fetch instance and verify ownership
    const instance = await prisma.instance.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        access: true,
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    if (instance.status !== 'RUNNING') {
      return NextResponse.json(
        { error: 'Instance is not running' },
        { status: 400 }
      );
    }

    if (!instance.access?.url) {
      return NextResponse.json(
        { error: 'Instance URL not available' },
        { status: 400 }
      );
    }

    // Fetch API key
    const apiKey = await prisma.apiKey.findUnique({
      where: {
        id: apiKeyId,
        instanceId: params.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not found' },
        { status: 404 }
      );
    }

    // Fetch executions from n8n
    const n8nUrl = `${instance.access.url}/api/v1/executions`;
    console.log('Fetching executions from:', n8nUrl);

    const n8nResponse = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey.key,
        'Accept': 'application/json',
      },
    });

    if (!n8nResponse.ok) {
      console.error('n8n API error:', n8nResponse.status, await n8nResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch executions from n8n' },
        { status: n8nResponse.status }
      );
    }

    const data = await n8nResponse.json();
    
    // n8n returns executions in different formats depending on version
    // Usually: { data: [...], count: X } or just [...]
    const executions = data.data || data;
    const total = data.count || executions.length;

    return NextResponse.json({
      executions: executions,
      total: total,
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}