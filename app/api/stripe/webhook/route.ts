import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-server';
import { SubscriptionManager } from '@/lib/stripe/subscription-manager';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { email } from '@/lib/email';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers(); // Await the headers promise
  const signature = headersList.get('stripe-signature'); // Then call get() on the result

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const manager = new SubscriptionManager();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        // Session completed, subscription will be created
        console.log('Checkout session completed:', session.id);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await manager.handleSubscriptionUpdated(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription;
        await manager.handleSubscriptionDeleted(deletedSub.id);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        // You can add usage-based billing logic here
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', failedInvoice.id);
        if (failedInvoice.customer_email) {
          const portalUrl = `${process.env.NEXTAUTH_URL}/billing`;
          const plan = failedInvoice.lines?.data?.[0]?.description ?? 'your plan';
          email.paymentFailed(failedInvoice.customer_email, plan, portalUrl).catch(() => {});
        } else if (failedInvoice.customer) {
          // Look up email from DB via stripeCustomerId
          prisma.user.findFirst({
            where: { stripeCustomerId: String(failedInvoice.customer) },
            select: { email: true, subscription: true },
          }).then(async (user) => {
            if (!user?.email) return;
            const portalUrl = `${process.env.NEXTAUTH_URL}/billing`;
            const plan = user.subscription?.plan ?? 'your plan';
            await email.paymentFailed(user.email, String(plan), portalUrl);
          }).catch(() => {});
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}