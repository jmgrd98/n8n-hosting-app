// app/(dashboard)/dashboard/instances/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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

interface Instance {
  id: string;
  name: string;
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'DESTROYING' | 'UPDATING';
  config: {
    version: string;
    size: string;
    region: string;
    environment?: Record<string, string>;
    resources?: {
      cpu: string;
      memory: string;
      storage: string;
    };
  };
  access?: {
    url?: string;
    adminUsername?: string;
    apiKey?: string;
  };
  awsResources?: {
    ecsCluster?: string;
    ecsService?: string;
    rdsEndpoint?: string;
    albDnsName?: string;
    vpcId?: string;
    securityGroupId?: string;
  };
  monitoring?: {
    metricsEnabled: boolean;
    logsRetention: number;
    alertsEnabled: boolean;
  };
  billing?: {
    monthlyCharge: number;
    hourlyRate: number;
    totalUsageHours: number;
  };
  stats?: {
    totalExecutions: number;
    totalWorkflows: number;
    totalUptime: number;
    healthStatus?: string;
  };
  latestMetrics?: {
    resources?: {
      cpuUtilization?: number;
      memoryUsed?: number;
      memoryAvailable?: number;
      storageUsed?: number;
      storageAvailable?: number;
    };
    timestamp?: string;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  stoppedAt?: string;
}

export default function InstanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const instanceId = params.id as string;

  // Fetch instance details
  const fetchInstance = async () => {
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
  };

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
  }, [session, sessionStatus, instanceId, instance?.status]);

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
      setError(`Failed to ${action} instance. Please try again.`);
    } finally {
      setActionLoading(null);
      if (action === 'delete') {
        setDeleteDialogOpen(false);
      }
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
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

  const getHealthColor = (health?: string) => {
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
          <p>Loading instance details...</p>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Instance Not Found</h2>
          <p className="text-gray-600 mb-4">The instance you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{instance.name}</h1>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="capitalize">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(instance.status)} mr-2`} />
                  {instance.status.toLowerCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  ID: {instance.id}
                </span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Actions
                  <MoreVertical className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {instance.status === 'RUNNING' && (
                  <>
                    <DropdownMenuItem onClick={() => handleAction('stop')}>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Instance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('restart')}>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Restart Instance
                    </DropdownMenuItem>
                  </>
                )}
                {instance.status === 'STOPPED' && (
                  <DropdownMenuItem onClick={() => handleAction('start')}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Instance
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Instance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Alerts */}
        {instance.status === 'PROVISIONING' && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>Instance is being provisioned</AlertTitle>
            <AlertDescription>
              Your n8n instance is being set up. This usually takes 3-5 minutes.
            </AlertDescription>
          </Alert>
        )}

        {instance.status === 'FAILED' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Instance deployment failed</AlertTitle>
            <AlertDescription>
              There was an issue deploying your instance. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions for Running Instance */}
        {instance.status === 'RUNNING' && instance.access?.url && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium">Your instance is running</span>
              </div>
              <Button asChild>
                <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open n8n Interface
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
            <DialogTitle>Delete Instance</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{instance.name}&quot;? This action cannot be undone.
              All data, workflows, and configurations will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading === 'delete'}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('delete')}
              disabled={actionLoading === 'delete'}
            >
              {actionLoading === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Instance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}