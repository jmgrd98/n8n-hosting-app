import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
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
