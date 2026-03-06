'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  CreditCard,
  Download,
  TrendingUp,
  Calendar,
  Server,
  FileText,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    instanceLimit: number;
    currentPeriodEnd: string;
    stripeSubscriptionId: string;
  } | null;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  stripeSubscription: {
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null;
  instances: Array<{
    id: string;
    name: string;
    status: string;
    config: { size: string; region: string };
    billing: { monthlyCharge: number; hourlyRate: number; totalUsageHours: number };
  }>;
  totalMonthlyCost: number;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  date: number;
  periodStart: number;
  periodEnd: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export default function BillingPage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [error, setError] = useState('');
  const [managingBilling, setManagingBilling] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/billing');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch billing data');
      }
      const data = await response.json();
      setBillingData(data);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/invoices?limit=10');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (session?.user?.id) {
      fetchBillingData();
      fetchInvoices();
    }
  }, [session, sessionStatus, router, fetchBillingData, fetchInvoices]);

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) throw new Error('Failed to create portal session');

      const data = await response.json();
      window.location.href = data.url;
    } catch {
      toast.error(t('failedToOpenPortal'));
      setManagingBilling(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      PAST_DUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      CANCELED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      uncollectible: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      void: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingBilling')}</p>
        </div>
      </div>
    );
  }

  const subscription = billingData?.subscription;
  const paymentMethod = billingData?.paymentMethod;
  const instances = billingData?.instances || [];
  const totalMonthlyCost = billingData?.totalMonthlyCost || 0;
  const runningInstances = instances.filter((i) => i.status === 'RUNNING').length;
  const currentMonthUsage = instances.reduce(
    (sum, i) => sum + ((i.billing?.hourlyRate || 0) * (i.billing?.totalUsageHours || 0)),
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>{t('subscriptionOverview')}</CardTitle>
              <CardDescription className="mt-1">{t('subscriptionOverviewDescription')}</CardDescription>
            </div>
            {subscription ? (
              <Button onClick={handleManageBilling} disabled={managingBilling}>
                {managingBilling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                {t('manageSubscription')}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  {t('upgradePlan')}
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-sm text-gray-500">{t('currentPlan')}</p>
              <p className="text-2xl font-bold">{subscription?.plan || 'FREE'}</p>
            </div>
            <Badge variant="outline" className={getStatusColor(subscription?.status || 'FREE')}>
              {subscription?.status || 'FREE'}
            </Badge>
            {subscription?.currentPeriodEnd && (
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500">{t('renewsOn')}</p>
                <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
          </div>
          {billingData?.stripeSubscription?.cancelAtPeriodEnd && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('cancelAtPeriodEnd')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('currentMonthEstimate')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${currentMonthUsage.toFixed(2)}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('basedOnRunning', { count: runningInstances })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('monthlyCommitment')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('totalInstances', { count: instances.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('nextBillingDate')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {subscription?.currentPeriodEnd
                ? formatDate(subscription.currentPeriodEnd)
                : '-'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {paymentMethod
                ? `${paymentMethod.brand.toUpperCase()} ····${paymentMethod.last4}`
                : t('noPaymentMethod')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('paymentMethod')}
              </CardTitle>
              <CardDescription className="mt-1">{t('managePaymentMethod')}</CardDescription>
            </div>
            <Button variant="outline" onClick={handleManageBilling} disabled={managingBilling}>
              {tc('update')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethod ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium">
                  {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)}{' '}
                  {t('endingIn')} {paymentMethod.last4}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('expires')} {paymentMethod.expMonth}/{paymentMethod.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">{t('noPaymentMethodAdded')}</p>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown by Instance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {t('costBreakdown')}
          </CardTitle>
          <CardDescription>{t('monthlyCostsByInstance')}</CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('noActiveInstances')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                    <th className="pb-3 font-medium">{t('instanceName')}</th>
                    <th className="pb-3 font-medium">{t('size')}</th>
                    <th className="pb-3 font-medium">{t('region')}</th>
                    <th className="pb-3 font-medium">{t('status')}</th>
                    <th className="pb-3 font-medium text-right">{t('monthlyCost')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {instances.map((instance) => (
                    <tr key={instance.id} className="text-sm">
                      <td className="py-3 font-medium">{instance.name}</td>
                      <td className="py-3">{instance.config.size}</td>
                      <td className="py-3">{instance.config.region}</td>
                      <td className="py-3">
                        <Badge
                          variant={instance.status === 'RUNNING' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {instance.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-medium">
                        ${instance.billing?.monthlyCharge?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-sm">
                    <td colSpan={4} className="py-3">
                      {tc('total')}
                    </td>
                    <td className="py-3 text-right">${totalMonthlyCost.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('invoiceHistory')}
              </CardTitle>
              <CardDescription className="mt-1">{t('viewAndDownload')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('noInvoices')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                    <th className="pb-3 font-medium">{t('invoice')}</th>
                    <th className="pb-3 font-medium">{t('date')}</th>
                    <th className="pb-3 font-medium">{t('status')}</th>
                    <th className="pb-3 font-medium text-right">{t('amount')}</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="text-sm">
                      <td className="py-3 font-medium">{invoice.number || invoice.id}</td>
                      <td className="py-3">{formatDate(invoice.date)}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={getStatusColor(invoice.status || '')}>
                          {invoice.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-medium">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        {invoice.pdfUrl && (
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Notice */}
      <Alert className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('billingNotice')}</AlertDescription>
      </Alert>
    </div>
  );
}
