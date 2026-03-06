import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { SubscriptionManager } from '@/lib/stripe/subscription-manager';

const subscriptionManager = new SubscriptionManager();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { successUrl, cancelUrl } = await request.json();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await subscriptionManager.createSetupCheckoutSession(
      session.user.id,
      successUrl || `${baseUrl}/dashboard?setup=success`,
      cancelUrl || `${baseUrl}/dashboard?setup=canceled`,
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating setup checkout session:', error);
    return NextResponse.json({ error: 'Failed to create setup session' }, { status: 500 });
  }
}
