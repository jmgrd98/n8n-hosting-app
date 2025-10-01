import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { SubscriptionManager } from '@/lib/stripe/subscription-manager';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('REQUEST', request);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 404 }
      );
    }

    const manager = new SubscriptionManager();
    const portalSession = await manager.createPortalSession(
      user.stripeCustomerId,
      `${process.env.NEXT_PUBLIC_URL}/dashboard`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}