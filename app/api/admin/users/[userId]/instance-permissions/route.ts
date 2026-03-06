import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { Permission } from '@prisma/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;
    const grants = await prisma.userInstancePermission.findMany({
      where: { userId },
    });

    // Enrich with instance names
    const instanceIds = grants.map(g => g.instanceId);
    const instances = await prisma.instance.findMany({
      where: { id: { in: instanceIds } },
      select: { id: true, name: true, status: true },
    });
    const instanceMap = Object.fromEntries(instances.map(i => [i.id, i]));

    const result = grants.map(g => ({
      instanceId: g.instanceId,
      instanceName: instanceMap[g.instanceId]?.name ?? 'Unknown',
      instanceStatus: instanceMap[g.instanceId]?.status ?? 'UNKNOWN',
      permissions: g.permissions,
    }));

    return NextResponse.json({ grants: result });
  } catch (error) {
    console.error('Failed to get instance permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;
    const body = await req.json();
    const { instanceId, permissions } = body as { instanceId: string; permissions: Permission[] };

    if (!instanceId) return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });

    const validPermissions = Object.values(Permission);
    const invalid = (permissions ?? []).filter(p => !validPermissions.includes(p));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid permissions: ${invalid.join(', ')}` }, { status: 400 });
    }

    const grant = await prisma.userInstancePermission.upsert({
      where: { userId_instanceId: { userId, instanceId } },
      create: {
        userId,
        instanceId,
        permissions: permissions ?? [],
        grantedById: session.user.id,
      },
      update: {
        permissions: permissions ?? [],
        grantedById: session.user.id,
      },
    });

    return NextResponse.json({ grant });
  } catch (error) {
    console.error('Failed to upsert instance permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) return NextResponse.json({ error: 'instanceId query param is required' }, { status: 400 });

    await prisma.userInstancePermission.delete({
      where: { userId_instanceId: { userId, instanceId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete instance permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
