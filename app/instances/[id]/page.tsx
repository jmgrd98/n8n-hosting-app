// app/(dashboard)/dashboard/instances/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
// import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuLabel,
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Server, 
  Activity, 
  // Settings, 
  Play, 
  Pause,
  RotateCw,
  Trash2, 
  ExternalLink, 
  AlertCircle,
  MoreVertical,
  RefreshCw,
  // Clock,
  DollarSign,
  Cpu,
  HardDrive,
  // Globe,
  // Database,
  // Shield,
  Copy,
  Check,
  Download,
  Terminal,
  AlertTriangle,
  Loader2,
  Info,
  // Zap,
  Link2,
  // Key
} from 'lucide-react';

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
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const instanceId = params.id as string;

  // Fetch instance details
  const fetchInstance = async () => {
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

  // Fetch instance logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/instances/${instanceId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
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
  }, [session, sessionStatus, instanceId]);

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

  const cpuUsage = instance.latestMetrics?.resources?.cpuUtilization || 0;
  const memoryUsage = instance.latestMetrics?.resources?.memoryUsed || 0;
  const memoryTotal = instance.latestMetrics?.resources?.memoryAvailable || 0;
  const storageUsage = instance.latestMetrics?.resources?.storageUsed || 0;
  const storageTotal = instance.latestMetrics?.resources?.storageAvailable || 0;
  
  const memoryPercent = memoryTotal > 0 ? (memoryUsage / memoryTotal) * 100 : 0;
  const storagePercent = storageTotal > 0 ? (storageUsage / storageTotal) * 100 : 0;

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Access Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Access Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Instance URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {instance.access?.url || 'Not available yet'}
                      </code>
                      {instance.access?.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(instance.access!.url!, 'url')}
                        >
                          {copiedField === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Admin Username</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {instance.access?.adminUsername || 'admin@example.com'}
                      </code>
                    </div>
                  </div>
                  
                  {instance.access?.apiKey && (
                    <div>
                      <label className="text-sm text-gray-600">API Key</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                          {instance.access.apiKey.substring(0, 10)}...
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(instance.access!.apiKey!, 'apikey')}
                        >
                          {copiedField === 'apikey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Instance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Instance Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Workflows</span>
                    <span className="font-medium">{instance.stats?.totalWorkflows || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Executions</span>
                    <span className="font-medium">{instance.stats?.totalExecutions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Uptime</span>
                    <span className="font-medium">{instance.stats?.totalUptime || 0} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Health Status</span>
                    <span className={`font-medium capitalize ${getHealthColor(instance.stats?.healthStatus)}`}>
                      {instance.stats?.healthStatus || 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm text-gray-600">Monthly Cost</label>
                    <p className="text-2xl font-bold">${instance.billing?.monthlyCharge || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Hourly Rate</label>
                    <p className="text-2xl font-bold">${instance.billing?.hourlyRate || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Total Usage</label>
                    <p className="text-2xl font-bold">{instance.billing?.totalUsageHours || 0} hrs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Instance Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-600">Size</label>
                    <p className="font-medium capitalize">{instance.config.size}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Region</label>
                    <p className="font-medium">{instance.config.region}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">n8n Version</label>
                    <p className="font-medium">v{instance.config.version}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Created</label>
                    <p className="font-medium">{new Date(instance.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {instance.config.resources && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Resources</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-gray-500" />
                          <span>{instance.config.resources.cpu}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-gray-500" />
                          <span>{instance.config.resources.memory}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-gray-500" />
                          <span>{instance.config.resources.storage}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {instance.awsResources && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">AWS Resources</h4>
                      <div className="space-y-2 text-sm">
                        {instance.awsResources.vpcId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">VPC</span>
                            <code>{instance.awsResources.vpcId}</code>
                          </div>
                        )}
                        {instance.awsResources.ecsCluster && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">ECS Cluster</span>
                            <code>{instance.awsResources.ecsCluster}</code>
                          </div>
                        )}
                        {instance.awsResources.rdsEndpoint && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Database</span>
                            <code>{instance.awsResources.rdsEndpoint}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            {instance.status === 'RUNNING' ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Resource Usage</CardTitle>
                    <CardDescription>
                      Last updated: {instance.latestMetrics?.timestamp 
                        ? new Date(instance.latestMetrics.timestamp).toLocaleString()
                        : 'Never'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">CPU Usage</span>
                        <span className="text-sm">{cpuUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={cpuUsage} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Memory Usage</span>
                        <span className="text-sm">
                          {memoryUsage.toFixed(0)}MB / {memoryTotal.toFixed(0)}MB
                        </span>
                      </div>
                      <Progress value={memoryPercent} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Storage Usage</span>
                        <span className="text-sm">
                          {(storageUsage / 1024).toFixed(1)}GB / {(storageTotal / 1024).toFixed(1)}GB
                        </span>
                      </div>
                      <Progress value={storagePercent} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Avg Response Time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">245ms</p>
                      <p className="text-xs text-green-600">-12% from last week</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Success Rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">99.8%</p>
                      <p className="text-xs text-green-600">+0.2% from last week</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Active Webhooks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-xs text-gray-600">2 pending</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Metrics Available</h3>
                    <p className="text-gray-600">
                      Metrics are only available when the instance is running.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Instance Logs
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchLogs}
                      disabled={logsLoading}
                    >
                      {logsLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                  {logsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : logs.length > 0 ? (
                    logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      No logs available. Click refresh to load logs.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Instance Settings</CardTitle>
                <CardDescription>
                  Configure your n8n instance settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Monitoring</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Metrics</p>
                        <p className="text-sm text-gray-600">Collect performance metrics</p>
                      </div>
                      <Badge>{instance.monitoring?.metricsEnabled ? 'Enabled' : 'Disabled'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Alerts</p>
                        <p className="text-sm text-gray-600">Receive notifications for issues</p>
                      </div>
                      <Badge>{instance.monitoring?.alertsEnabled ? 'Enabled' : 'Disabled'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Logs Retention</p>
                        <p className="text-sm text-gray-600">How long to keep logs</p>
                      </div>
                      <Badge>{instance.monitoring?.logsRetention} days</Badge>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Danger Zone</h4>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Deleting an instance is permanent and cannot be undone. All data will be lost.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="destructive"
                    className="mt-4"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Instance
                  </Button>
                </div>
              </CardContent>
            </Card>
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