'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface SettingsInstance {
  name: string;
  monitoring?: {
    metricsEnabled: boolean;
    logsRetention: number;
    alertsEnabled: boolean;
  };
}

interface SettingsTabProps {
  instance: SettingsInstance;
  onDelete: () => void;
}

export function SettingsTab({ instance, onDelete }: SettingsTabProps) {
  const t = useTranslations('instance.settingsTab');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">{t('monitoring')}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('enableMetrics')}</p>
                <p className="text-sm text-gray-600">{t('enableMetricsDescription')}</p>
              </div>
              <Badge>{instance.monitoring?.metricsEnabled ? t('enabled') : t('disabled')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('enableAlerts')}</p>
                <p className="text-sm text-gray-600">{t('enableAlertsDescription')}</p>
              </div>
              <Badge>{instance.monitoring?.alertsEnabled ? t('enabled') : t('disabled')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('logsRetention')}</p>
                <p className="text-sm text-gray-600">{t('logsRetentionDescription')}</p>
              </div>
              <Badge>{t('days', { count: instance.monitoring?.logsRetention ?? 0 })}</Badge>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-3">{t('dangerZone')}</h4>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('warning')}</AlertTitle>
            <AlertDescription>
              {t('deleteWarning')}
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('deleteInstance')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}