'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface SubscriptionCardProps {
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: Date;
    instanceLimit: number;
  };
  instanceCount: number;
}

export function SubscriptionCard({ subscription, instanceCount }: SubscriptionCardProps) {
  const t = useTranslations('subscription');
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('freePlan')}</CardTitle>
          <CardDescription>
            {t('freeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('instanceLimit')}</p>
              <p className="text-2xl font-bold">{instanceCount} / 1</p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/pricing">{t('upgradePlan')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('plan', { plan: subscription.plan })}</CardTitle>
            <CardDescription>
              {t('renews', { date: format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy') })}
            </CardDescription>
          </div>
          <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {subscription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('instanceLimit')}</p>
            <p className="text-2xl font-bold">
              {instanceCount} / {subscription.instanceLimit === -1 ? '∞' : subscription.instanceLimit}
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleManageBilling}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {t('manageBilling')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}