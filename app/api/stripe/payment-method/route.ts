import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { SubscriptionManager } from '@/lib/stripe/subscription-manager';

const subscriptionManager = new SubscriptionManager();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const hasPaymentMethod = await subscriptionManager.hasPaymentMethod(session.user.id);
    return NextResponse.json({ hasPaymentMethod });
  } catch (error) {
    console.error('Error checking payment method:', error);
    return NextResponse.json({ error: 'Failed to check payment method' }, { status: 500 });
  }
}
