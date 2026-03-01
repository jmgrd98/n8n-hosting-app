// components/instance-card.tsx
'use client';

import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  Trash2,
  ExternalLink,
  MoreVertical,
  Clock,
  DollarSign,
  Settings,
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'DESTROYING';
  config: {
    version: string;
    size: string;
    region: string;
  };
  access?: {
    url?: string;
  };
  createdAt: string;
  billing?: {
    monthlyCharge: number;
  };
}

interface InstanceCardProps {
  instance: Instance;
  onAction: (instanceId: string, action: 'start' | 'stop' | 'delete') => Promise<void>;
}

export function InstanceCard({ instance, onAction }: InstanceCardProps) {
  const router = useRouter();
  const t = useTranslations('instanceCard');
  const tc = useTranslations('common');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500';
      case 'STOPPED': return 'bg-gray-500';
      case 'PROVISIONING': return 'bg-blue-500';
      case 'FAILED': return 'bg-red-500';
      case 'DESTROYING': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <Badge variant="outline" className="capitalize">
        <span className={`w-2 h-2 rounded-full ${color} mr-2`} />
        {status.toLowerCase()}
      </Badge>
    );
  };

  const handleCardClick = () => {
    router.push(`/instances/${instance.id}`);
  };

  const handleActionClick = (e: React.MouseEvent, action: 'start' | 'stop' | 'delete') => {
    e.stopPropagation();
    onAction(instance.id, action);
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-gray-400"
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{instance.name}</CardTitle>
            <CardDescription className="mt-1">
              {instance.config.size} • {instance.config.region} • v{instance.config.version}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {getStatusBadge(instance.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {instance.status === 'RUNNING' && (
                  <>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(e, 'stop');
                    }}>
                      <Pause className="w-4 h-4 mr-2" />
                      {t('stopInstance')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/instances/${instance.id}`}>
                        <Settings className="w-4 h-4 mr-2" />
                        {tc('settings')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {instance.status === 'STOPPED' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(e, 'start');
                  }}>
                    <Play className="w-4 h-4 mr-2" />
                    {t('startInstance')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(e, 'delete');
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('deleteInstance')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t('created', { date: new Date(instance.createdAt).toLocaleDateString() })}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${instance.billing?.monthlyCharge || 0}{tc('month')}
            </div>
          </div>
          {instance.status === 'RUNNING' && instance.access?.url && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('openN8n')}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}