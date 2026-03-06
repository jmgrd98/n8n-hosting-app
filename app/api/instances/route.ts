// app/api/instances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('REQ', request);
    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Fetching instances for user:', session.user.id);
    
    // Get instance IDs the user has been granted permissions on
    const permissionGrants = await prisma.userInstancePermission.findMany({
      where: { userId: session.user.id },
      select: { instanceId: true },
    });
    const sharedInstanceIds = permissionGrants.map(g => g.instanceId);

    // Query owned instances + instances shared via permissions
    const instances = await prisma.instance.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { id: { in: sharedInstanceIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`Found ${instances.length} instances for user ${session.user.id}`);
    
    return NextResponse.json({ instances });
  } catch (error) {
    console.error('Failed to fetch instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}