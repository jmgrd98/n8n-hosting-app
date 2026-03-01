// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Server,
  Settings,
  RefreshCw,
  User,
  LogOut,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { CreateInstanceDialog } from '@/components/create-instance-dialog';
import { InstanceCard } from '@/components/instance-card';
import type { Instance } from '@/types/n8n';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch instances
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
      console.log('Fetched instances:', data);
      // Filter out deleted instances
      const activeInstances = (data.instances || []).filter(
        (instance: Instance) => instance.status !== 'DELETED'
      );
      setInstances(activeInstances);
    } catch (error) {
      console.error('Error fetching instances:', error);
      setError(t('failedToLoadInstances'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      console.log('Session user ID:', session.user.id);
      fetchInstances();
    }
  }, [session, sessionStatus, router, fetchInstances]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInstances();
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleInstanceAction = async (instanceId: string, action: 'start' | 'stop' | 'delete') => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} instance`);
      }

      // Refresh instances
      fetchInstances();
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
      setError(t('failedToAction', { action }));
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingInstances')}</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = instances.reduce((sum, instance) =>
    sum + (instance.billing?.monthlyCharge || 0), 0
  );

  const runningInstances = instances.filter(i => i.status === 'RUNNING').length;
  const stoppedInstances = instances.filter(i => i.status === 'STOPPED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">{t('brand')}</h1>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-sm font-medium">
                  {tc('instances')}
                </Link>
                <Link href="/dashboard/billing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  {tc('billing')}
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  {tc('settings')}
                </Link>
              </nav>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {session?.user?.email || tc('user')}
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {t('welcomeBack', { name: session?.user?.name ? `, ${session.user.name}` : '' })}
          </h2>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('totalInstances')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{instances.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('running')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{runningInstances}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stopped')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stoppedInstances}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('monthlyCost')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tc('error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Instances Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">{t('yourInstances')}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {tc('refresh')}
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('newInstance')}
              </Button>
            </div>
          </div>

          {instances.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">{t('noInstances')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('noInstancesDescription')}
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createFirstInstance')}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => (
                <InstanceCard
                  key={instance.id}
                  instance={instance}
                  onAction={handleInstanceAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Instance Dialog */}
      <CreateInstanceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchInstances}
      />
    </div>
  );
}
