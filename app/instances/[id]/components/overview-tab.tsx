// app/(dashboard)/dashboard/instances/[id]/components/overview-tab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Database,
  Globe,
  Copy,
  ExternalLink,
  Check,
  Activity,
  GitBranch,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import type { Instance } from '@/types/n8n';

interface OverviewTabProps {
  instanceId: string;
  instance: Instance;
  copiedField: string | null;
  onCopy: (text: string, field: string | null | undefined) => void;
  getHealthColor: (health?: string | null) => string;
}

export function OverviewTab({ 
  instanceId, 
  instance, 
  copiedField, 
  onCopy, 
  getHealthColor 
}: OverviewTabProps) {
  const [liveStats, setLiveStats] = useState<{
    workflowCount: number;
    executionCount: number;
    loading: boolean;
  }>({
    workflowCount: instance.stats?.totalWorkflows || 0,
    executionCount: instance.stats?.totalExecutions || 0,
    loading: false,
  });

  // Fetch live workflow count from n8n
  const fetchLiveStats = async () => {
    console.log('🔍 fetchLiveStats called', {
      status: instance.status,
      hasUrl: !!instance.access?.url,
      url: instance.access?.url
    });

    if (instance.status !== 'RUNNING' || !instance.access?.url) {
      console.log('❌ Early return - instance not ready', {
        status: instance.status,
        hasUrl: !!instance.access?.url
      });
      return;
    }

    setLiveStats(prev => ({ ...prev, loading: true }));

    try {
      // First, fetch API keys
      console.log('🔑 Fetching API keys...');
      const apiKeysResponse = await fetch(`/api/instances/${instanceId}/api-keys`);
      
      if (!apiKeysResponse.ok) {
        console.log('❌ Failed to fetch API keys');
        setLiveStats(prev => ({ ...prev, loading: false }));
        return;
      }

      const apiKeysData = await apiKeysResponse.json();
      const firstApiKey = apiKeysData.apiKeys?.[0];

      if (!firstApiKey) {
        console.log('❌ No API keys available');
        setLiveStats({ workflowCount: 0, executionCount: 0, loading: false });
        return;
      }

      console.log('✅ Using API key:', firstApiKey.id);

      // Fetch workflows and executions in parallel
      const [workflowsResponse, executionsResponse] = await Promise.all([
        fetch(`/api/instances/${instanceId}/workflows`, {
          headers: { 'X-API-Key-ID': firstApiKey.id },
        }),
        fetch(`/api/instances/${instanceId}/executions`, {
          headers: { 'X-API-Key-ID': firstApiKey.id },
        }),
      ]);

      console.log('📥 Workflows response:', workflowsResponse.status, workflowsResponse.ok);
      console.log('📥 Executions response:', executionsResponse.status, executionsResponse.ok);

      let workflowCount = 0;
      let executionCount = 0;

      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        workflowCount = workflowsData.workflows?.length || 0;
        console.log('✅ Workflows count:', workflowCount);
      }

      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        executionCount = executionsData.executions?.length || executionsData.total || 0;
        console.log('✅ Executions count:', executionCount);
      }

      setLiveStats({
        workflowCount,
        executionCount,
        loading: false,
      });
    } catch (error) {
      console.error('💥 Error fetching live stats:', error);
      setLiveStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Fetch live stats on mount and when instance becomes running
  useEffect(() => {
    fetchLiveStats();
  }, [instanceId, instance.status]);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${getHealthColor(instance.stats?.healthStatus)}`} />
              <span className="text-2xl font-bold capitalize">
                {instance.stats?.healthStatus || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Workflows</span>
              {liveStats.loading && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span className="text-2xl font-bold">{liveStats.workflowCount}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLiveStats}
                disabled={liveStats.loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${liveStats.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Executions</span>
              {liveStats.loading && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="text-2xl font-bold">
                {liveStats.executionCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-2xl font-bold">
                {instance.stats?.totalUptime 
                  ? `${Math.floor(instance.stats.totalUptime / 3600)}h`
                  : '0h'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Workflow Generator CTA */}
      {instance.status === 'RUNNING' && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Create Workflows with AI</h3>
                <p className="text-sm text-gray-600">
                  Describe what you want to automate and let AI build the workflow for you
                </p>
              </div>
            </div>
            <Button 
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Link href={`/dashboard/instances/${instanceId}/workflows`}>
                <Sparkles className="w-4 h-4 mr-2" />
                Try AI Generator
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Access Information */}
      <Card>
        <CardHeader>
          <CardTitle>Access Information</CardTitle>
          <CardDescription>Connection details for your n8n instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instance.access?.url && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Instance URL</p>
                  <a 
                    href={instance.access.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {instance.access.url}
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(instance.access!.url!, 'url')}
                >
                  {copiedField === 'url' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {instance.access?.adminUsername && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Admin Username</p>
                  <p className="text-sm text-gray-600">{instance.access.adminUsername}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(instance.access!.adminUsername!, 'username')}
              >
                {copiedField === 'username' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {instance.access?.apiKey && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">API Key</p>
                  <p className="text-sm text-gray-600 font-mono">
                    {instance.access.apiKey.substring(0, 20)}...
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(instance.access!.apiKey!, 'apiKey')}
              >
                {copiedField === 'apiKey' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Infrastructure Details */}
      {instance.awsResources && (
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Details</CardTitle>
            <CardDescription>AWS resources powering your instance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {instance.awsResources.ecsCluster && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ECS Cluster</span>
                <Badge variant="outline">{instance.awsResources.ecsCluster}</Badge>
              </div>
            )}
            {instance.awsResources.ecsService && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ECS Service</span>
                <Badge variant="outline">{instance.awsResources.ecsService}</Badge>
              </div>
            )}
            {instance.awsResources.rdsEndpoint && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Database</span>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="font-mono text-xs">{instance.awsResources.rdsEndpoint}</span>
                </div>
              </div>
            )}
            {instance.awsResources.vpcId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">VPC ID</span>
                <Badge variant="outline">{instance.awsResources.vpcId}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Instance specifications and settings</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Version</p>
            <p className="font-medium">{instance.config.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Size</p>
            <p className="font-medium uppercase">{instance.config.size}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Region</p>
            <p className="font-medium">{instance.config.region}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Monthly Cost</p>
            <p className="font-medium">${instance.billing?.monthlyCharge || 0}/month</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}