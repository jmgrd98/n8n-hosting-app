import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Link2, Activity, DollarSign, Copy, Check } from 'lucide-react';
import { Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface Instance {
  access?: {
    url?: string;
    adminUsername?: string;
    apiKey?: string;
  };
  stats?: {
    totalExecutions: number;
    totalWorkflows: number;
    totalUptime: number;
    healthStatus?: string;
  };
  billing?: {
    monthlyCharge: number;
    hourlyRate: number;
    totalUsageHours: number;
  };
}

interface OverviewTabProps {
  instance: Instance;
  instanceId: string; // Add this
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  getHealthColor: (health?: string) => string;
}

export function OverviewTab({ instance, instanceId, copiedField, onCopy, getHealthColor }: OverviewTabProps) {
  return (
    <div className="space-y-6">
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
                    onClick={() => onCopy(instance.access!.url!, 'url')}
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
                    onClick={() => onCopy(instance.access!.apiKey!, 'apikey')}
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

      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Workflow Generator
          </CardTitle>
          <CardDescription>
            Create automation workflows using artificial intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Describe what you want to automate in plain English, and AI will create a complete n8n workflow for you. 
            No coding required!
          </p>
          <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Link href={`/instances/${instanceId}/workflows`}>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Workflows with AI
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}