'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Terminal, RefreshCw, Download, Loader2, Circle } from 'lucide-react';

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
  stackTrace?: string | null;
}

interface LogsTabProps {
  instanceId: string;
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG:    'text-gray-400',
  INFO:     'text-blue-400',
  WARNING:  'text-yellow-400',
  ERROR:    'text-red-400',
  CRITICAL: 'text-red-600 font-bold',
};

export function LogsTab({ instanceId }: LogsTabProps) {
  const t = useTranslations('instance.logsTab');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el && atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    const es = new EventSource(`/api/instances/${instanceId}/logs/stream`);

    es.onopen = () => {
      setConnected(true);
      setLoading(false);
    };

    es.onmessage = (event) => {
      try {
        const incoming: LogEntry[] = JSON.parse(event.data);
        if (incoming.length > 0) {
          setLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const fresh = incoming.filter(l => !existingIds.has(l.id));
            return [...prev, ...fresh];
          });
        }
      } catch {
        // malformed SSE event — ignore
      }
    };

    es.onerror = () => {
      setConnected(false);
      setLoading(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [instanceId]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const handleDownload = () => {
    const text = logs
      .map(l =>
        `[${new Date(l.timestamp).toISOString()}] [${l.level}] [${l.source}] ${l.message}${l.stackTrace ? '\n' + l.stackTrace : ''}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instance-${instanceId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            {t('title')}
            {connected ? (
              <Badge variant="outline" className="text-green-600 border-green-600 gap-1 text-xs">
                <Circle className="w-2 h-2 fill-green-500 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 gap-1 text-xs">
                <Circle className="w-2 h-2 fill-gray-400" />
                Offline
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLogs([])}
              disabled={logs.length === 0}
              title="Clear logs"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={logs.length === 0}
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="mb-1 leading-relaxed">
                <span className="text-gray-500 mr-2 text-xs">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`mr-2 text-xs uppercase ${LEVEL_COLORS[log.level] ?? 'text-gray-300'}`}>
                  [{log.level}]
                </span>
                <span className="text-gray-400 mr-2 text-xs">[{log.source}]</span>
                <span>{log.message}</span>
                {log.stackTrace && (
                  <pre className="text-red-400 text-xs mt-1 ml-4 whitespace-pre-wrap">{log.stackTrace}</pre>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center py-8">
              {t('noLogs')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
