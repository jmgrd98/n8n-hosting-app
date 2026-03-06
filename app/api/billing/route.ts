import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';
import { stripe } from '@/lib/stripe/stripe-server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let paymentMethod = null;
    let stripeSubscription = null;

    if (user.stripeCustomerId) {
      // Fetch default payment method from Stripe
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        if (!('deleted' in customer && customer.deleted)) {
          const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
          if (defaultPaymentMethodId && typeof defaultPaymentMethodId === 'string') {
            const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
            if (pm.card) {
              paymentMethod = {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              };
            }
          }

          // If no default, try to list payment methods
          if (!paymentMethod) {
            const methods = await stripe.paymentMethods.list({
              customer: user.stripeCustomerId,
              type: 'card',
              limit: 1,
            });
            if (methods.data[0]?.card) {
              const card = methods.data[0].card;
              paymentMethod = {
                brand: card.brand,
                last4: card.last4,
                expMonth: card.exp_month,
                expYear: card.exp_year,
              };
            }
          }
        }

        // Fetch active subscription from Stripe
        if (user.subscription?.stripeSubscriptionId) {
          try {
            stripeSubscription = await stripe.subscriptions.retrieve(
              user.subscription.stripeSubscriptionId
            );
          } catch {
            // Subscription may no longer exist in Stripe
          }
        }
      } catch (e) {
        console.error('Error fetching Stripe data:', e);
      }
    }

    // Fetch instances for cost breakdown
    const instances = await prisma.instance.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'DELETED' },
      },
      select: {
        id: true,
        name: true,
        status: true,
        config: true,
        billing: true,
      },
    });

    const totalMonthlyCost = instances.reduce(
      (sum, i) => sum + (i.billing?.monthlyCharge || 0),
      0
    );

    return NextResponse.json({
      subscription: user.subscription,
      paymentMethod,
      stripeSubscription: stripeSubscription
        ? {
            status: stripeSubscription.status,
            currentPeriodEnd: stripeSubscription.items.data[0]?.current_period_end,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          }
        : null,
      instances,
      totalMonthlyCost,
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}
