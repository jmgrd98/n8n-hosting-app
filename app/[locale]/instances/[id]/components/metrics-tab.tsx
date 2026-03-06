'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Instance } from '@/types/n8n';
import { Activity, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MetricsTabProps {
  instance: Instance;
}

interface N8nMetrics {
  workflowCount?: number | null;
  executionCount?: number | null;
  failedExecutions?: number | null;
  activeUsers?: number | null;
  averageExecutionTime?: number | null;
}

interface MetricsResponse {
  latest?: {
    resources?: {
      cpuUtilization?: number | null;
      memoryUsed?: number | null;
      memoryAvailable?: number | null;
      storageUsed?: number | null;
      storageAvailable?: number | null;
    };
    n8nMetrics?: N8nMetrics;
    timestamp?: string;
  };
}

export function MetricsTab({ instance }: MetricsTabProps) {
  const t = useTranslations('instance.metricsTab');
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetricsData(data);
      }
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [instance.id]);

  useEffect(() => {
    if (instance.status === 'RUNNING') {
      fetchMetrics();
    }
  }, [instance.status, fetchMetrics]);

  if (instance.status !== 'RUNNING') {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">{t('noMetrics')}</h3>
            <p className="text-gray-600">{t('noMetricsDescription')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resources = metricsData?.latest?.resources ?? instance.latestMetrics?.resources;
  const n8n: N8nMetrics = metricsData?.latest?.n8nMetrics ?? instance.latestMetrics?.n8nMetrics ?? {};
  const lastUpdated = metricsData?.latest?.timestamp ?? instance.latestMetrics?.timestamp;

  const cpuUsage = resources?.cpuUtilization ?? 0;
  const memoryUsed = resources?.memoryUsed ?? 0;
  const memoryTotal = resources?.memoryAvailable ?? 0;
  const storageUsed = resources?.storageUsed ?? 0;
  const storageTotal = resources?.storageAvailable ?? 0;

  const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;
  const storagePercent = storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0;

  const execCount = n8n.executionCount ?? 0;
  const failedCount = n8n.failedExecutions ?? 0;
  const successRate = execCount > 0
    ? `${(((execCount - failedCount) / execCount) * 100).toFixed(1)}%`
    : '—';
  const avgExecTime = n8n.averageExecutionTime != null
    ? `${Math.round(n8n.averageExecutionTime)}ms`
    : '—';
  const workflowCount = n8n.workflowCount ?? '—';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('resourceUsage')}</CardTitle>
              <CardDescription>
                {t('lastUpdated', {
                  time: lastUpdated
                    ? new Date(lastUpdated).toLocaleString()
                    : t('never'),
                })}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchMetrics} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('cpuUsage')}</span>
              <span className="text-sm">{cpuUsage.toFixed(1)}%</span>
            </div>
            <Progress value={cpuUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('memoryUsage')}</span>
              <span className="text-sm">
                {memoryUsed.toFixed(0)}MB / {memoryTotal.toFixed(0)}MB
              </span>
            </div>
            <Progress value={memoryPercent} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('storageUsage')}</span>
              <span className="text-sm">
                {(storageUsed / 1024).toFixed(1)}GB / {(storageTotal / 1024).toFixed(1)}GB
              </span>
            </div>
            <Progress value={storagePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('avgResponseTime')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgExecTime}</p>
            <p className="text-xs text-gray-500 mt-1">
              {execCount > 0 ? `${execCount} total executions` : 'No executions recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('successRate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{successRate}</p>
            <p className="text-xs text-gray-500 mt-1">
              {failedCount > 0 ? `${failedCount} failed` : 'No failures recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('activeWebhooks')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workflowCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {n8n.activeUsers != null ? `${n8n.activeUsers} active users` : 'workflows configured'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
