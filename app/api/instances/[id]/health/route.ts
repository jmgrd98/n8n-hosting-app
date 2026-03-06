import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const instance = await getInstanceById(id);

    if (!instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    if (instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (instance.status !== 'RUNNING' || !instance.access?.url) {
      return NextResponse.json({
        healthStatus: instance.stats?.healthStatus || 'unknown',
        lastHealthCheck: instance.stats?.lastHealthCheck || null,
      });
    }

    let healthStatus = 'unhealthy';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const healthResponse = await fetch(
        `${instance.access.url}/healthz`,
        {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        }
      );

      clearTimeout(timeoutId);

      healthStatus = healthResponse.ok ? 'healthy' : 'unhealthy';
    } catch {
      healthStatus = 'unhealthy';
    }

    const now = new Date();

    await prisma.instance.update({
      where: { id },
      data: {
        stats: {
          set: {
            totalExecutions: instance.stats?.totalExecutions ?? 0,
            totalWorkflows: instance.stats?.totalWorkflows ?? 0,
            totalUptime: instance.stats?.totalUptime ?? 0,
            healthStatus,
            lastHealthCheck: now,
          },
        },
      },
    });

    return NextResponse.json({
      healthStatus,
      lastHealthCheck: now.toISOString(),
    });
  } catch (error) {
    console.error('Failed to check instance health:', error);
    return NextResponse.json(
      { error: 'Failed to check instance health' },
      { status: 500 }
    );
  }
}
