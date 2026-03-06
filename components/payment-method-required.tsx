'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';

export function PaymentMethodRequired() {
  const t = useTranslations('paymentMethod');
  const [loading, setLoading] = useState(false);

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/dashboard?setup=success`,
          cancelUrl: `${window.location.origin}/dashboard?setup=canceled`,
        }),
      });

      if (!response.ok) throw new Error('Failed to create setup session');

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error redirecting to payment setup:', error);
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
          <CreditCard className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span>{t('secureNote')}</span>
        </div>
        <Button
          onClick={handleAddPaymentMethod}
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('redirecting')}
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {t('addCard')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
