import Stripe from 'stripe';
import { stripe } from './stripe-server';
import { prisma } from '@/lib/database';
import { SubscriptionStatus, PlanType as PrismaPlanType, PlanType } from '@prisma/client';
import { CheckoutSessionConfig, LocalStateConfig, PriceIds, S3StateConfig } from '@/types/infrastructure';
import { email as emailService } from '@/lib/email';

export function isS3StateConfig(
  config: S3StateConfig | LocalStateConfig
): config is S3StateConfig {
  return 'bucket' in config;
}

export function isNamedError(error: unknown): error is { name: string } {
  return typeof error === 'object' && error !== null && 'name' in error;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return 'Unknown error occurred';
}

export const INSTANCE_LIMITS: Record<PlanType, number> = {
  FREE: 1,
  STARTER: 3,
  PROFESSIONAL: 10,
  ENTERPRISE: -1,
};

export const PRICE_IDS: PriceIds = {
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

export class SubscriptionManager {
  async createCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  async createCheckoutSession(config: CheckoutSessionConfig): Promise<Stripe.Checkout.Session> {
    const user = await prisma.user.findUnique({
      where: { id: config.userId },
    });
    if (!user) throw new Error('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.createCustomer(config.userId, user.email, user.name ?? undefined);
      customerId = customer.id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
      metadata: { userId: config.userId },
      subscription_data: {
        metadata: { userId: config.userId },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    };

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      throw new Error('Subscription item not found');
    }
    const priceId = firstItem.price.id;
    const cpsEpoch = firstItem.current_period_start;
    const cpeEpoch = firstItem.current_period_end;

    const plan = this.getPlanFromPriceId(priceId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: this.mapStripeStatus(subscription.status),
          plan: this.mapToPrismaPlanType(plan),
          instanceLimit: INSTANCE_LIMITS[plan],
          currentPeriodStart: new Date(cpsEpoch * 1000),
          currentPeriodEnd: new Date(cpeEpoch * 1000),
          canceledAt: null,
        },
      },
    });

    // Send subscription created email (fire-and-forget)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      emailService
        .subscriptionCreated(user.email, plan, INSTANCE_LIMITS[plan])
        .catch(() => {});
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      throw new Error('Subscription item not found');
    }
    const priceId = firstItem.price.id;
    const cpsEpoch = firstItem.current_period_start;
    const cpeEpoch = firstItem.current_period_end;

    const plan = this.getPlanFromPriceId(priceId);

    const canceledAtRaw = subscription.canceled_at ?? subscription.cancel_at;
    let canceledAtDate: Date | null = null;
    if (typeof canceledAtRaw === 'number') {
      canceledAtDate = new Date(canceledAtRaw * 1000);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: this.mapStripeStatus(subscription.status),
          plan: this.mapToPrismaPlanType(plan),
          instanceLimit: INSTANCE_LIMITS[plan],
          currentPeriodStart: new Date(cpsEpoch * 1000),
          currentPeriodEnd: new Date(cpeEpoch * 1000),
          canceledAt: canceledAtDate,
        },
      },
    });
  }

  async handleSubscriptionDeleted(subscriptionId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        subscription: {
          is: {
            stripeSubscriptionId: subscriptionId,
          },
        },
      },
    });
    if (!user) return;
    const existing = user.subscription;
    if (!existing) return;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscription: {
          set: {
            ...existing,
            status: 'CANCELED',
            canceledAt: new Date(),
          },
        },
      },
    });

    await prisma.instance.updateMany({
      where: {
        userId: user.id,
        status: 'RUNNING',
      },
      data: {
        status: 'STOPPED',
      },
    });

    // Send subscription cancelled email (fire-and-forget)
    emailService
      .subscriptionCancelled(user.email, existing.plan)
      .catch(() => {});
  }

  async hasPaymentMethod(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return false;

    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if ('deleted' in customer && customer.deleted) return false;

      const defaultPm = customer.invoice_settings?.default_payment_method;
      if (defaultPm) return true;

      const methods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
        limit: 1,
      });
      return methods.data.length > 0;
    } catch {
      return false;
    }
  }

  async createSetupCheckoutSession(userId: string, successUrl: string, cancelUrl: string): Promise<Stripe.Checkout.Session> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.createCustomer(userId, user.email, user.name ?? undefined);
      customerId = customer.id;
    }

    return await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    });
  }

  async canCreateInstance(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const instanceCount = await prisma.instance.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    if (!user.subscription || user.subscription.status !== 'ACTIVE') {
      return instanceCount < 1;
    }

    const limit = user.subscription.instanceLimit;
    return limit === -1 || instanceCount < limit;
  }

  private getPlanFromPriceId(priceId: string): PlanType {
    const priceIdMap: Record<string, PlanType> = {
      [PRICE_IDS.STARTER]: 'STARTER',
      [PRICE_IDS.PROFESSIONAL]: 'PROFESSIONAL',
      [PRICE_IDS.ENTERPRISE]: 'ENTERPRISE',
    };
    return priceIdMap[priceId] ?? 'FREE';
  }

  private mapToPrismaPlanType(plan: PlanType): PrismaPlanType {
    const planMap: Record<PlanType, PrismaPlanType> = {
      FREE: 'FREE',
      STARTER: 'STARTER',
      PROFESSIONAL: 'PROFESSIONAL',
      ENTERPRISE: 'ENTERPRISE',
    };
    return planMap[plan];
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      trialing: 'TRIALING',
      unpaid: 'UNPAID',
      paused: 'PAST_DUE', // paused subscriptions are not active but not canceled
    };
    return statusMap[status] ?? 'CANCELED';
  }
}
