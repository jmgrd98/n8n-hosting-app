import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        globalPermissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get instance counts per user
    const instanceCounts = await prisma.instance.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: { deletedAt: null },
    });
    const countMap = Object.fromEntries(
      instanceCounts.map(r => [r.userId, r._count.id])
    );

    const result = users.map(u => ({
      ...u,
      instanceCount: countMap[u.id] ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
