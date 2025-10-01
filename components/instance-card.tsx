// components/instances/InstanceCard.tsx
'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  MoreVertical, 
  Play, 
  Square, 
  RotateCw, 
  Download,
  Settings,
  Trash2,
  ExternalLink,
  Activity,
  Copy,
  Shield,
  HardDrive,
  Clock,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Instance {
  id: string;
  name: string;
  status: string;
  url?: string;
  access?: {
    url?: string;
  };
  config: {
    version: string;
    size: string;
    region: string;
  };
  createdAt: string;
  lastDeployment?: string;
  latestMetrics?: {
    resources?: {
      cpuUtilization?: number;
      memoryUsed?: number;
      memoryAvailable?: number;
      storageUsed?: number;
    };
    n8nMetrics?: {
      workflowCount?: number;
      executionCount?: number;
      failedExecutions?: number;
    };
  };
  stats?: {
    totalWorkflows?: number;
    totalExecutions?: number;
  };
  billing?: {
    monthlyCharge?: number;
  };
}

interface InstanceCardProps {
  instance: Instance;
  onUpdate?: () => void;
}

export function InstanceCard({ instance, onUpdate }: InstanceCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  console.log(isLoading)
  // Convert status to uppercase to match database enum
  const normalizedStatus = instance.status.toUpperCase();

  const statusConfig: Record<string, { color: string; text: string; pulse: boolean }> = {
    PROVISIONING: { 
      color: 'bg-blue-500', 
      text: 'Provisioning', 
      pulse: true 
    },
    STARTING: { 
      color: 'bg-yellow-500', 
      text: 'Starting', 
      pulse: true 
    },
    RUNNING: { 
      color: 'bg-green-500', 
      text: 'Running', 
      pulse: false 
    },
    STOPPING: { 
      color: 'bg-orange-500', 
      text: 'Stopping', 
      pulse: true 
    },
    STOPPED: { 
      color: 'bg-gray-500', 
      text: 'Stopped', 
      pulse: false 
    },
    FAILED: { 
      color: 'bg-red-500', 
      text: 'Failed', 
      pulse: false 
    },
    DESTROYING: { 
      color: 'bg-red-600', 
      text: 'Destroying', 
      pulse: true 
    }
  };

  const sizeConfig: Record<string, { cpu: string; memory: string; storage: string }> = {
    SMALL: { cpu: '0.5 vCPU', memory: '1 GB', storage: '20 GB' },
    MEDIUM: { cpu: '1 vCPU', memory: '2 GB', storage: '50 GB' },
    LARGE: { cpu: '2 vCPU', memory: '4 GB', storage: '100 GB' },
    XLARGE: { cpu: '4 vCPU', memory: '8 GB', storage: '200 GB' }
  };

  async function handleAction(action: string) {
    setActionLoading(action);
    
    try {
      const response = await fetch(`/api/instances/${instance.id}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} instance`);
      }

      toast.success(`Instance ${action} initiated successfully`);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
      toast.error(`Failed to ${action} instance`, {
        description: 'Please try again or contact support',
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  }

  async function deleteInstance() {
    const confirmDelete = confirm(
      `Are you sure you want to delete instance "${instance.name}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/instances/${instance.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete instance');
      }

      toast.success('Instance scheduled for deletion', {
        description: 'The instance will be removed shortly',
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Failed to delete instance', {
        description: 'Please try again or contact support',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const status = statusConfig[normalizedStatus] || statusConfig.PROVISIONING;
  const normalizedSize = instance.config.size.toUpperCase();
  const sizeInfo = sizeConfig[normalizedSize] || sizeConfig.SMALL;
  
  // Get URL from access object or root level
  const instanceUrl = instance.access?.url || instance.url;

  // Calculate metrics if available
  const cpuUsage = instance.latestMetrics?.resources?.cpuUtilization || 0;
  const memoryUsage = instance.latestMetrics?.resources?.memoryUsed || 0;
  const memoryTotal = instance.latestMetrics?.resources?.memoryAvailable || 0;
  const memoryPercent = memoryTotal > 0 ? (memoryUsage / (memoryUsage + memoryTotal)) * 100 : 0;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${status.color}`}>
        {status.pulse && (
          <div className="h-full bg-white/30 animate-pulse" />
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              {instance.name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {instance.id.substring(0, 12)}...
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/instances/${instance.id}`}>
                  <Activity className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/instances/${instance.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/instances/${instance.id}/logs`}>
                  <Activity className="mr-2 h-4 w-4" />
                  View Logs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleAction('backup')}
                disabled={normalizedStatus !== 'RUNNING'}
              >
                <Download className="mr-2 h-4 w-4" />
                Create Backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={deleteInstance}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Instance
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <Badge 
          variant={normalizedStatus === 'RUNNING' ? 'default' : 'secondary'}
          className="w-fit mt-2"
        >
          <span className={`mr-1.5 h-2 w-2 rounded-full ${status.color}`} />
          {status.text}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Instance URL */}
        {instanceUrl && normalizedStatus === 'RUNNING' && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <a 
              href={instanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              {instanceUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => copyToClipboard(instanceUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Instance Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Version:</span>
            <span className="font-medium">{instance.config.version}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Size:</span>
            <span className="font-medium">{instance.config.size}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Region:</span>
            <span className="font-medium">{instance.config.region}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(instance.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Specs */}
        <div className="flex gap-4 p-3 bg-muted/30 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">CPU:</span>
            <span className="font-medium">{sizeInfo.cpu}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">RAM:</span>
            <span className="font-medium">{sizeInfo.memory}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">Storage:</span>
            <span className="font-medium">{sizeInfo.storage}</span>
          </div>
        </div>

        {/* Metrics (if running) */}
        {normalizedStatus === 'RUNNING' && instance.latestMetrics?.resources && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Resource Usage</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">CPU</span>
                <span className="text-xs font-medium">{cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${cpuUsage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Memory</span>
                <span className="text-xs font-medium">{memoryPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        {normalizedStatus === 'STOPPED' && (
          <Button
            size="sm"
            onClick={() => handleAction('start')}
            disabled={actionLoading === 'start'}
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
        )}
        
        {normalizedStatus === 'RUNNING' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('restart')}
              disabled={actionLoading === 'restart'}
              className="flex-1"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('stop')}
              disabled={actionLoading === 'stop'}
              className="flex-1"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </>
        )}

        {normalizedStatus === 'FAILED' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction('restart')}
            disabled={actionLoading === 'restart'}
            className="flex-1"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Retry Deployment
          </Button>
        )}

        {['PROVISIONING', 'STARTING', 'STOPPING', 'DESTROYING'].includes(normalizedStatus) && (
          <Button size="sm" disabled className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {status.text}...
            </div>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}