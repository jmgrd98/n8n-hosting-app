'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Server,
  RefreshCw,
  AlertCircle,
  Activity,
  Pause,
  DollarSign,
  Layers,
} from 'lucide-react';
import { CreateInstanceDialog } from '@/components/create-instance-dialog';
import { InstanceCard } from '@/components/instance-card';
import { PaymentMethodRequired } from '@/components/payment-method-required';
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
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);

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
      fetchInstances();
      fetch('/api/stripe/payment-method')
        .then(res => res.json())
        .then(data => setHasPaymentMethod(data.hasPaymentMethod ?? false))
        .catch(() => setHasPaymentMethod(false));
    }
  }, [session, sessionStatus, router, fetchInstances]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInstances();
  };

  const handleNewInstance = () => {
    if (hasPaymentMethod === false) {
      setShowPaymentPrompt(true);
    } else {
      setCreateDialogOpen(true);
    }
  };

  const handleInstanceAction = async (instanceId: string, action: 'start' | 'stop' | 'delete') => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} instance`);
      }

      fetchInstances();
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
      setError(t('failedToAction', { action }));
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto gradient-primary rounded-2xl flex items-center justify-center animate-pulse">
            <Server className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground">{t('loadingInstances')}</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = instances.reduce((sum, instance) =>
    sum + (instance.billing?.monthlyCharge || 0), 0
  );

  const runningInstances = instances.filter(i => i.status === 'RUNNING').length;
  const stoppedInstances = instances.filter(i => i.status === 'STOPPED').length;

  const stats = [
    {
      label: t('totalInstances'),
      value: instances.length,
      icon: Layers,
      gradient: 'from-violet-500 to-purple-600',
      glowClass: '',
    },
    {
      label: t('running'),
      value: runningInstances,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-600',
      glowClass: runningInstances > 0 ? 'glow-green' : '',
    },
    {
      label: t('stopped'),
      value: stoppedInstances,
      icon: Pause,
      gradient: 'from-slate-400 to-slate-500',
      glowClass: '',
    },
    {
      label: t('monthlyCost'),
      value: `$${totalMonthlyCost.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-amber-500 to-orange-600',
      glowClass: '',
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Welcome Section */}
      <div className="mb-8 animate-fade-up">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
          {t('welcomeBack', { name: session?.user?.name ? `, ${session.user.name}` : '' })}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`glass-card rounded-2xl p-5 animate-fade-up ${stat.glowClass}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`w-8 h-8 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6 animate-scale-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tc('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Instances Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t('yourInstances')}</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="glass-card border-border/50 hover:border-primary/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {tc('refresh')}
            </Button>
            <Button
              size="sm"
              onClick={handleNewInstance}
              className="gradient-primary text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newInstance')}
            </Button>
          </div>
        </div>

        {instances.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/50 flex items-center justify-center">
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('noInstances')}</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t('noInstancesDescription')}
            </p>
            <Button
              onClick={handleNewInstance}
              className="gradient-primary text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('createFirstInstance')}
            </Button>
          </div>
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

      {/* Create Instance Dialog */}
      <CreateInstanceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchInstances}
      />

      {/* Payment Method Required Dialog */}
      <Dialog open={showPaymentPrompt} onOpenChange={setShowPaymentPrompt}>
        <DialogContent className="max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('paymentRequired')}</DialogTitle>
          </DialogHeader>
          <PaymentMethodRequired />
        </DialogContent>
      </Dialog>
    </div>
  );
}
