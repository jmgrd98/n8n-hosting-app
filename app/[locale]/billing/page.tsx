// app/(dashboard)/dashboard/billing/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  CreditCard,
  Download,
  TrendingUp,
  Calendar,
  Server,
  User,
  Settings,
  LogOut,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  status: string;
  config: {
    size: string;
    region: string;
  };
  billing: {
    monthlyCharge: number;
    hourlyRate: number;
    totalUsageHours: number;
  };
  createdAt: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  period: string;
  invoiceNumber: string;
}

export default function BillingPage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock invoice data - replace with actual API call
  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      date: '2025-10-01',
      amount: 198.00,
      status: 'paid',
      period: 'September 2025',
      invoiceNumber: 'INV-2025-09',
    },
    {
      id: '2',
      date: '2025-09-01',
      amount: 149.00,
      status: 'paid',
      period: 'August 2025',
      invoiceNumber: 'INV-2025-08',
    },
    {
      id: '3',
      date: '2025-08-01',
      amount: 99.00,
      status: 'paid',
      period: 'July 2025',
      invoiceNumber: 'INV-2025-07',
    },
  ]);

  const fetchInstances = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/instances');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch instances');
      }

      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchInstances();
    }
  }, [session, sessionStatus, router, fetchInstances]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingBilling')}</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = instances.reduce((sum, instance) => 
    sum + (instance.billing?.monthlyCharge || 0), 0
  );

  const currentMonthUsage = instances.reduce((sum, instance) => 
    sum + ((instance.billing?.hourlyRate || 0) * (instance.billing?.totalUsageHours || 0)), 0
  );

  const runningInstances = instances.filter(i => i.status === 'RUNNING').length;

  const getStatusBadge = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">{td('brand')}</h1>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  {tc('instances')}
                </Link>
                <Link href="/dashboard/billing" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tc('billing')}
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  {tc('settings')}
                </Link>
              </nav>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {session?.user?.email || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{tc('myAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  {tc('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  {tc('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  {tc('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
              <div className="text-3xl font-bold">Nov 1</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('paymentMethodCard')}
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
                <CardDescription className="mt-1">
                  {t('managePaymentMethod')}
                </CardDescription>
              </div>
              <Button variant="outline">{tc('update')}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium">{t('visaEnding')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('expires')}</p>
              </div>
            </div>
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
              <div className="text-center py-8 text-gray-500">
                {t('noActiveInstances')}
              </div>
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
                          <Badge variant={instance.status === 'RUNNING' ? 'default' : 'secondary'} className="text-xs">
                            {instance.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">
                          ${instance.billing?.monthlyCharge.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-sm">
                      <td colSpan={4} className="py-3">{tc('total')}</td>
                      <td className="py-3 text-right">
                        ${totalMonthlyCost.toFixed(2)}
                      </td>
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
                <CardDescription className="mt-1">
                  {t('viewAndDownload')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {tc('downloadAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                    <th className="pb-3 font-medium">{t('invoice')}</th>
                    <th className="pb-3 font-medium">{t('period')}</th>
                    <th className="pb-3 font-medium">{t('date')}</th>
                    <th className="pb-3 font-medium">{t('status')}</th>
                    <th className="pb-3 font-medium text-right">{t('amount')}</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="text-sm">
                      <td className="py-3 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3">{invoice.period}</td>
                      <td className="py-3">
                        {new Date(invoice.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3">{getStatusBadge(invoice.status)}</td>
                      <td className="py-3 text-right font-medium">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Billing Information Notice */}
        <Alert className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('billingNotice')}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}