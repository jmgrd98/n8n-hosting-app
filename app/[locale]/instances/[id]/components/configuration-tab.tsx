'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Instance } from '@/types/n8n';
import { Cpu, Server, HardDrive } from 'lucide-react';
import { useTranslations } from 'next-intl';


interface ConfigurationTabProps {
  instance: Instance;
}

export function ConfigurationTab({ instance }: ConfigurationTabProps) {
  const t = useTranslations('instance.configTab');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-600">{t('size')}</label>
            <p className="font-medium capitalize">{instance.config.size}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">{t('region')}</label>
            <p className="font-medium">{instance.config.region}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">{t('version')}</label>
            <p className="font-medium">v{instance.config.version}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">{t('created')}</label>
            <p className="font-medium">{new Date(instance.createdAt).toLocaleString()}</p>
          </div>
        </div>
        
        {instance.config.resources && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">{t('resources')}</h4>
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
              <h4 className="font-medium mb-3">{t('awsResources')}</h4>
              <div className="space-y-2 text-sm">
                {instance.awsResources.vpcId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('vpc')}</span>
                    <code>{instance.awsResources.vpcId}</code>
                  </div>
                )}
                {instance.awsResources.ecsCluster && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ecsCluster')}</span>
                    <code>{instance.awsResources.ecsCluster}</code>
                  </div>
                )}
                {instance.awsResources.rdsEndpoint && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('database')}</span>
                    <code>{instance.awsResources.rdsEndpoint}</code>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}