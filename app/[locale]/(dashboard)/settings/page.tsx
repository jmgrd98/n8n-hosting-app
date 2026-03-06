'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Palette,
  Globe,
  Bell,
  Server,
  Link as LinkIcon,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface Preferences {
  theme: string;
  language: string;
  emailNotifications: boolean;
  marketingEmails: boolean;
  defaultInstanceSize: string | null;
  defaultRegion: string | null;
}

interface ConnectedAccount {
  provider: string;
}

const INSTANCE_SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'];
const REGIONS = [
  'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1',
  'ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'sa-east-1',
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tci = useTranslations('createInstance');
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme: currentTheme, setTheme } = useTheme();

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/user/settings');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setPreferences(data.preferences);
      setConnectedAccounts(data.connectedAccounts);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchSettings();
  }, [sessionStatus, router, fetchSettings]);

  const savePreferences = async (updates: Partial<Preferences>) => {
    if (!preferences) return;

    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    setSaving(true);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success(t('settingsSaved'));
    } catch {
      toast.error(t('failedToSave'));
      setPreferences(preferences); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    savePreferences({ theme: value });
  };

  const handleLanguageChange = (value: string) => {
    savePreferences({ language: value });
    // Redirect to new locale
    const newPath = pathname;
    router.push(newPath, { locale: value });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deleteConfirmation,
          confirmEmail: deleteConfirmation,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success(t('accountDeleted'));
      await signOut({ redirect: false });
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failedToDelete'));
    } finally {
      setDeleting(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingSettings')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {t('appearance')}
            </CardTitle>
            <CardDescription>{t('appearanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>{t('theme')}</Label>
              <div className="flex gap-2">
                {[
                  { value: 'light', icon: Sun, label: t('light') },
                  { value: 'dark', icon: Moon, label: t('dark') },
                  { value: 'system', icon: Monitor, label: t('system') },
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={currentTheme === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange(value)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t('language')}
                </Label>
                <p className="text-sm text-gray-500">{t('languageDescription')}</p>
              </div>
              <Select
                value={preferences?.language || 'pt-BR'}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('notifications')}
            </CardTitle>
            <CardDescription>{t('notificationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('emailNotifications')}</Label>
                <p className="text-sm text-gray-500">{t('emailNotificationsDescription')}</p>
              </div>
              <Switch
                checked={preferences?.emailNotifications ?? true}
                onCheckedChange={(checked) =>
                  savePreferences({ emailNotifications: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('marketingEmails')}</Label>
                <p className="text-sm text-gray-500">{t('marketingEmailsDescription')}</p>
              </div>
              <Switch
                checked={preferences?.marketingEmails ?? false}
                onCheckedChange={(checked) =>
                  savePreferences({ marketingEmails: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Instance Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              {t('defaultInstanceConfig')}
            </CardTitle>
            <CardDescription>{t('defaultInstanceConfigDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('defaultSize')}</Label>
                <p className="text-sm text-gray-500">{t('defaultSizeDescription')}</p>
              </div>
              <Select
                value={preferences?.defaultInstanceSize || ''}
                onValueChange={(value) =>
                  savePreferences({ defaultInstanceSize: value || null })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('noDefault')} />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('defaultRegion')}</Label>
                <p className="text-sm text-gray-500">{t('defaultRegionDescription')}</p>
              </div>
              <Select
                value={preferences?.defaultRegion || ''}
                onValueChange={(value) =>
                  savePreferences({ defaultRegion: value || null })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('noDefault')} />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {tci(`regions.${region}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              {t('connectedAccounts')}
            </CardTitle>
            <CardDescription>{t('connectedAccountsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['google', 'github'].map((provider) => {
              const isConnected = connectedAccounts.some((a) => a.provider === provider);
              return (
                <div key={provider} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-sm font-medium capitalize">
                        {provider.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium capitalize">{provider}</p>
                      <p className="text-sm text-gray-500">
                        {isConnected ? t('connected') : t('notConnected')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isConnected ? 'default' : 'secondary'}>
                    {isConnected ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {t('connected')}
                      </span>
                    ) : (
                      t('notConnected')
                    )}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t('dangerZone')}
            </CardTitle>
            <CardDescription>{t('dangerZoneDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('deleteWarning')}</AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('deleteAccount')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('confirmDeleteLabel')}</Label>
              <Input
                type="password"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={t('confirmDeletePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!deleteConfirmation || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('deletingAccount')}
                </>
              ) : (
                t('deleteAccountConfirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('saving')}</span>
        </div>
      )}
    </div>
  );
}
