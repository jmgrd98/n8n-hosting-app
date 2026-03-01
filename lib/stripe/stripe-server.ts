import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Stripe price IDs from your Stripe Dashboard
export const PRICE_IDS = {
  STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

export const INSTANCE_LIMITS = {
  STARTER: 1,
  PROFESSIONAL: 5,
  ENTERPRISE: -1, // Unlimited
};
