// components/instance-tabs/ApiKeysTab.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Key,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Calendar,
  Info,
  Loader2,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

interface ApiKeysTabProps {
  instanceId: string;
  instanceStatus: string;
}

export function ApiKeysTab({ instanceId, instanceStatus }: ApiKeysTabProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const t = useTranslations('instance.apiKeysTab');
  const tc = useTranslations('common');

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/api-keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchApiKeys();
    console.log('INSTANCE ID', instanceId);
  }, [instanceId, fetchApiKeys]);

  const handleCreateApiKey = async () => {
    if (!newKeyName || !newApiKey) {
      setError(t('fillAllFields'));
      return;
    }

    setIsCreatingKey(true);
    setError('');
    console.log('INSTANCE ID', instanceId);
    try {
      const response = await fetch(`/api/instances/${instanceId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          apiKey: newApiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('failedToCreate'));
      }

      setNewKeyName('');
      setNewApiKey('');
      setApiKeyDialogOpen(false);
      await fetchApiKeys();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error creating API key:', error);
        setError(error.message);
      }
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/instances/${instanceId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('failedToDelete'));
      }

      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError(t('failedToDelete'));
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t('title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('description')}
            </CardDescription>
          </div>
          <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('addKey')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('addKeyTitle')}</DialogTitle>
                <DialogDescription>
                  {t('addKeyDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="key-name">{t('keyName')}</Label>
                  <Input
                    id="key-name"
                    placeholder={t('keyNamePlaceholder')}
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    {t('keyNameHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">{t('apiKeyLabel')}</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={t('apiKeyPlaceholder')}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    {t('apiKeyHint')}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
                  {tc('cancel')}
                </Button>
                <Button onClick={handleCreateApiKey} disabled={isCreatingKey}>
                  {isCreatingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('adding')}
                    </>
                  ) : (
                    t('addKey')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {instanceStatus !== 'RUNNING' && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('instanceNotRunning')}
            </AlertDescription>
          </Alert>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">{t('noKeysYet')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('noKeysDescription')}
            </p>
            {instanceStatus === 'RUNNING' && (
              <Button
                onClick={() => setApiKeyDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstKey')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{apiKey.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{t('created', { date: new Date(apiKey.createdAt).toLocaleDateString() })}</span>
                      {apiKey.lastUsed && (
                        <>
                          <span>•</span>
                          <span>{t('lastUsed', { date: new Date(apiKey.lastUsed).toLocaleDateString() })}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteApiKey(apiKey.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 font-mono text-sm">
                    {visibleKeys.has(apiKey.id) ? apiKey.key : maskApiKey(apiKey.key)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                  >
                    {visibleKeys.has(apiKey.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.key, `apikey-${apiKey.id}`)}
                  >
                    {copiedField === `apikey-${apiKey.id}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documentation */}
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>{t('howToTitle')}</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{t('howToStep1')}</p>
            <p>{t('howToStep2')}</p>
            <p>{t('howToStep3')}</p>
            <p>{t('howToStep4')}</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}