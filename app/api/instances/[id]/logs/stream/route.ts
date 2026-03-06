import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const instance = await getInstanceById(id);

  if (!instance) {
    return new Response('Instance not found', { status: 404 });
  }

  if (instance.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial batch: last 100 logs
      const initial = await prisma.instanceLog.findMany({
        where: { instanceId: id },
        orderBy: { timestamp: 'asc' },
        take: 100,
      });
      send(initial);

      let lastTimestamp = initial.length > 0
        ? initial[initial.length - 1].timestamp
        : new Date();

      // Poll for new logs every 3 seconds
      const interval = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(interval);
          controller.close();
          return;
        }

        try {
          const newLogs = await prisma.instanceLog.findMany({
            where: {
              instanceId: id,
              timestamp: { gt: lastTimestamp },
            },
            orderBy: { timestamp: 'asc' },
          });

          if (newLogs.length > 0) {
            lastTimestamp = newLogs[newLogs.length - 1].timestamp;
            send(newLogs);
          }
        } catch {
          // DB error — keep stream open, will retry next tick
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
