import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';
import { requireInstancePermission, Permission } from '@/lib/auth/permissions';

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

    // FIXED: Removed deletedAt check
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId: session.user.id,
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

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
    const { name, apiKey } = body;

    if (!name || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const instance = await prisma.instance.findFirst({
      where: { id: instanceId },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found or access denied' }, { status: 404 });
    }

    const permDenied = await requireInstancePermission(
      session.user.id, session.user.role, instanceId, instance.userId, Permission.MANAGE_API_KEYS
    );
    if (permDenied) return permDenied;

    const newApiKey = await prisma.apiKey.create({
      data: {
        instanceId,
        name,
        key: apiKey,
      },
    });

    return NextResponse.json({ success: true, apiKey: newApiKey });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}