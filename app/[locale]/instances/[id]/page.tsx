// app/(dashboard)/dashboard/instances/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft,
  Play, 
  Pause,
  RotateCw,
  Trash2, 
  ExternalLink, 
  AlertCircle,
  MoreVertical,
  AlertTriangle,
  Loader2,
  Info,
  Check,
} from 'lucide-react';

// Import tab components
import { OverviewTab } from './components/overview-tab';
import { ConfigurationTab } from './components/configuration-tab';
import { MetricsTab } from './components/metrics-tab';
import { ApiKeysTab } from './components/api-keys-tab';
import { LogsTab } from './components/logs-tab';
import { SettingsTab } from './components/settings-tab';

// Import the proper Instance type
import type { Instance } from '@/types/n8n';

export default function InstanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations('instance');
  const tc = useTranslations('common');
  
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const instanceId = params.id as string;

  // Fetch instance details
  const fetchInstance = useCallback(async () => {
    console.log('INSTANCE ID', instanceId);
    try {
      setError('');
      const response = await fetch(`/api/instances/${instanceId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch instance details');
      }
      
      const data = await response.json();
      setInstance(data.instance);
    } catch (error) {
      console.error('Error fetching instance:', error);
      setError('Failed to load instance details');
    } finally {
      setLoading(false);
    }
  }, [instanceId, router]);

  const checkHealth = useCallback(async () => {
    if (instance?.status !== 'RUNNING') return;

    try {
      const response = await fetch(`/api/instances/${instanceId}/health`);
      if (response.ok) {
        const data = await response.json();
        setInstance(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              totalExecutions: prev.stats?.totalExecutions ?? 0,
              totalWorkflows: prev.stats?.totalWorkflows ?? 0,
              totalUptime: prev.stats?.totalUptime ?? 0,
              healthStatus: data.healthStatus,
              lastHealthCheck: data.lastHealthCheck,
            },
          };
        });
      }
    } catch (error) {
      console.error('Error checking health:', error);
    }
  }, [instanceId, instance?.status]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchInstance();

      // Auto-refresh every 30 seconds if provisioning
      const interval = setInterval(() => {
        if (instance?.status === 'PROVISIONING' || instance?.status === 'UPDATING') {
          fetchInstance();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [session, sessionStatus, instanceId, instance?.status, fetchInstance, router]);

  // Health check polling for running instances
  useEffect(() => {
    if (instance?.status !== 'RUNNING') return;

    checkHealth();

    const healthInterval = setInterval(checkHealth, 60000);
    return () => clearInterval(healthInterval);
  }, [instance?.status, checkHealth]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    setActionLoading(action);
    setError('');
    
    try {
      const response = await fetch(`/api/instances/${instanceId}/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} instance`);
      }
      
      if (action === 'delete') {
        router.push('/dashboard');
      } else {
        await fetchInstance();
      }
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
      setError(t('failedToAction', { action }));
    } finally {
      setActionLoading(null);
      if (action === 'delete') {
        setDeleteDialogOpen(false);
      }
    }
  };

  const copyToClipboard = (text: string, field: string | null | undefined) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedField(field || null);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(error => {
        console.error('Failed to copy:', error);
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500';
      case 'STOPPED': return 'bg-gray-500';
      case 'PROVISIONING': return 'bg-blue-500';
      case 'UPDATING': return 'bg-yellow-500';
      case 'FAILED': return 'bg-red-500';
      case 'DESTROYING': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health?: string | null) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">{t('notFound')}</h2>
          <p className="text-gray-600 mb-4">{t('notFoundDescription')}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToDashboard')}
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{instance.name}</h1>
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(instance.status)} mr-2`} />
                  {t(`statuses.${instance.status}` as Parameters<typeof t>[0])}
                </Badge>
                <span className="text-sm text-gray-600">
                  ID: {instance.id}
                </span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {tc('actions')}
                  <MoreVertical className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {instance.status === 'RUNNING' && (
                  <>
                    <DropdownMenuItem onClick={() => handleAction('stop')}>
                      <Pause className="w-4 h-4 mr-2" />
                      {t('stopInstance')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('restart')}>
                      <RotateCw className="w-4 h-4 mr-2" />
                      {t('restartInstance')}
                    </DropdownMenuItem>
                  </>
                )}
                {instance.status === 'STOPPED' && (
                  <DropdownMenuItem onClick={() => handleAction('start')}>
                    <Play className="w-4 h-4 mr-2" />
                    {t('startInstance')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('deleteInstance')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tc('error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Alerts */}
        {instance.status === 'PROVISIONING' && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>{t('provisioning')}</AlertTitle>
            <AlertDescription>
              {t('provisioningDescription')}
            </AlertDescription>
          </Alert>
        )}

        {instance.status === 'FAILED' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('failed')}</AlertTitle>
            <AlertDescription>
              {t('failedDescription')}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions for Running Instance */}
        {instance.status === 'RUNNING' && instance.access?.url && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium">{t('instanceRunning')}</span>
              </div>
              <Button asChild>
                <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('openN8nInterface')}
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="configuration">{t('tabs.configuration')}</TabsTrigger>
            <TabsTrigger value="metrics">{t('tabs.metrics')}</TabsTrigger>
            <TabsTrigger value="api-keys">{t('tabs.apiKeys')}</TabsTrigger>
            <TabsTrigger value="logs">{t('tabs.logs')}</TabsTrigger>
            <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              instanceId={instanceId}
              instance={instance}
              copiedField={copiedField}
              onCopy={copyToClipboard}
              getHealthColor={getHealthColor}
            />
          </TabsContent>

          <TabsContent value="configuration">
            <ConfigurationTab instance={instance} />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsTab instance={instance} />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab 
              instanceId={instanceId}
              instanceStatus={instance.status}
            />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab instanceId={instanceId} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab 
              instance={instance}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmation', { name: instance.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading === 'delete'}
            >
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('delete')}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteInstance')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}