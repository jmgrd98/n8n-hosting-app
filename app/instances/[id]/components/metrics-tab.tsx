import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Instance } from '@/types/n8n';
import { Activity } from 'lucide-react';


interface MetricsTabProps {
  instance: Instance;
}

export function MetricsTab({ instance }: MetricsTabProps) {
  if (instance.status !== 'RUNNING') {
    return (
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
    <div className="space-y-6">
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
    </div>
  );
}