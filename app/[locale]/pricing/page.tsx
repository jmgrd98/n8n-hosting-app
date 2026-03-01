'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';

const PRICING_PLANS = [
  {
    name: 'starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  },
  {
    name: 'professional',
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL,
    popular: true,
  },
];

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tc = useTranslations('common');
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | undefined) => {
    console.log("PRICE ID", priceId);
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/pricing');
      return;
    }
    if (priceId) setLoading(priceId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      console.log('RESPONSE', response);

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? 'border-primary shadow-lg' : ''}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  {t('mostPopular')}
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{t(`${plan.name}.name`)}</CardTitle>
                <CardDescription>
                  {plan.price ? (
                    <>
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span>{tc('month')}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">{t('customPricing')}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {(t.raw(`${plan.name}.features`) as string[]).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.priceId)}
                  // disabled={loading === plan.priceId || !plan.priceId}
                >
                  {loading === plan.priceId ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {plan.price ? tc('startFreeTrial') : tc('contactSales')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}