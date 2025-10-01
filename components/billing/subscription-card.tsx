'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
          <CardTitle>Free Plan</CardTitle>
          <CardDescription>
            Upgrade to launch more instances and unlock premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Instance limit</p>
              <p className="text-2xl font-bold">{instanceCount} / 1</p>
            </div>
            <Button className="w-full" asChild>
              <a href="/pricing">Upgrade Plan</a>
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
            <CardTitle>{subscription.plan} Plan</CardTitle>
            <CardDescription>
              Renews {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
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
            <p className="text-sm text-muted-foreground">Instance limit</p>
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
            Manage Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}