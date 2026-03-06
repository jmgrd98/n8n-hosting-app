// components/instance-card.tsx
'use client';

import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
import { Instance } from '@/types/n8n';

interface InstanceCardProps {
  instance: Instance;
  onAction: (instanceId: string, action: 'start' | 'stop' | 'delete') => Promise<void>;
}

const statusConfig: Record<string, { color: string; dotColor: string; glow: string }> = {
  RUNNING: {
    color: 'text-emerald-600 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_oklch(0.65_0.2_145/0.3)]',
  },
  STOPPED: {
    color: 'text-muted-foreground',
    dotColor: 'bg-slate-400 dark:bg-slate-500',
    glow: '',
  },
  PROVISIONING: {
    color: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    glow: 'shadow-[0_0_8px_oklch(0.60_0.2_250/0.3)]',
  },
  FAILED: {
    color: 'text-red-600 dark:text-red-400',
    dotColor: 'bg-red-500',
    glow: 'shadow-[0_0_8px_oklch(0.60_0.22_25/0.3)]',
  },
  DESTROYING: {
    color: 'text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    glow: 'shadow-[0_0_8px_oklch(0.70_0.18_75/0.3)]',
  },
};

export function InstanceCard({ instance, onAction }: InstanceCardProps) {
  const router = useRouter();
  const t = useTranslations('instanceCard');
  const tc = useTranslations('common');

  const status = statusConfig[instance.status] || statusConfig.STOPPED;

  const handleCardClick = () => {
    router.push(`/instances/${instance.id}`);
  };

  const handleActionClick = (e: React.MouseEvent, action: 'start' | 'stop' | 'delete') => {
    e.stopPropagation();
    onAction(instance.id, action);
  };

  return (
    <div
      className="glass-card rounded-2xl cursor-pointer group"
      onClick={handleCardClick}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-semibold truncate group-hover:text-primary transition-colors">
              {instance.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {instance.config.size} &middot; {instance.config.region} &middot; v{instance.config.version}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Status badge */}
            <Badge variant="outline" className={`capitalize gap-2 border-border/50 ${status.color}`}>
              <span className={`w-2 h-2 rounded-full ${status.dotColor} ${status.glow} ${instance.status === 'RUNNING' || instance.status === 'PROVISIONING' ? 'animate-pulse' : ''}`} />
              {instance.status.toLowerCase()}
            </Badge>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-accent/50">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card w-48">
                {instance.status === 'RUNNING' && (
                  <>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(e, 'stop');
                    }} className="gap-2">
                      <Pause className="w-4 h-4" />
                      {t('stopInstance')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/instances/${instance.id}`} className="gap-2">
                        <Settings className="w-4 h-4" />
                        {tc('settings')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {instance.status === 'STOPPED' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(e, 'start');
                  }} className="gap-2">
                    <Play className="w-4 h-4" />
                    {t('startInstance')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(e, 'delete');
                  }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteInstance')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t('created', { date: new Date(instance.createdAt).toLocaleDateString() })}
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              ${instance.billing?.monthlyCharge || 0}/mo
            </div>
          </div>
          {instance.status === 'RUNNING' && instance.access?.url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
              className="glass-card border-border/50 hover:border-primary/30 h-8 text-xs"
            >
              <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {t('openN8n')}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
