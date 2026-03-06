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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { globalPermissions: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ globalPermissions: user.globalPermissions });
  } catch (error) {
    console.error('Failed to get global permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await params;
    const body = await req.json();
    const permissions: Permission[] = body.permissions ?? [];

    // Validate permissions
    const validPermissions = Object.values(Permission);
    const invalid = permissions.filter(p => !validPermissions.includes(p));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid permissions: ${invalid.join(', ')}` }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { globalPermissions: permissions },
      select: { globalPermissions: true },
    });

    return NextResponse.json({ globalPermissions: updated.globalPermissions });
  } catch (error) {
    console.error('Failed to update global permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
