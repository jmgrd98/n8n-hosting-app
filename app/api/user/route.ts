import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { stripe } from '@/lib/stripe/stripe-server';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { password, confirmEmail } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, password: true, stripeCustomerId: true, subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify identity: password for credentials users, email confirmation for OAuth users
    if (user.password) {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
      }
    } else {
      if (confirmEmail !== user.email) {
        return NextResponse.json({ error: 'Email confirmation does not match' }, { status: 400 });
      }
    }

    // Cancel Stripe subscription if active
    if (user.subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch (e) {
        console.error('Error cancelling subscription:', e);
      }
    }

    // Stop all running instances
    await prisma.instance.updateMany({
      where: { userId: session.user.id, status: 'RUNNING' },
      data: { status: 'STOPPED', stoppedAt: new Date() },
    });

    // Soft-delete instances
    await prisma.instance.updateMany({
      where: { userId: session.user.id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    // Delete user (cascades accounts, sessions)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
