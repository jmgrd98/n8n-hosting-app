import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { SubscriptionManager } from '@/lib/stripe/subscription-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    const manager = new SubscriptionManager();
    const checkoutSession = await manager.createCheckoutSession({
      userId: session.user.id,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard?payment=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_URL}/pricing?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}