'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Key,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  providers: string[];
  hasPassword: boolean;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Profile form
  const [name, setName] = useState('');
  const [image, setImage] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data.profile);
      setName(data.profile.name || '');
      setImage(data.profile.image || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
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
    fetchProfile();
  }, [sessionStatus, router, fetchProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success(t('profileUpdated'));
      fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failedToChangePassword'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{t('loadingProfile')}</p>
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
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('profileInfo')}
            </CardTitle>
            <CardDescription>{t('profileInfoDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-xs text-gray-500">{t('emailReadOnly')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">{t('avatarUrl')}</Label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tc('saving')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {tc('save')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('accountInfo')}
            </CardTitle>
            <CardDescription>{t('accountInfoDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('memberSince')}</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('currentPlan')}</p>
                <p className="font-medium">
                  <Badge variant="outline">
                    {profile?.subscription?.plan || 'FREE'}
                  </Badge>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('role')}</p>
                <p className="font-medium">
                  <Badge variant={profile?.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {profile?.role || 'USER'}
                  </Badge>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('authProviders')}</p>
                <div className="flex gap-2 mt-1">
                  {profile?.hasPassword && (
                    <Badge variant="outline">
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Badge>
                  )}
                  {profile?.providers.map((provider) => (
                    <Badge key={provider} variant="outline" className="capitalize">
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password — only for credential users */}
        {profile?.hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t('changePassword')}
              </CardTitle>
              <CardDescription>{t('changePasswordDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('changingPassword')}
                  </>
                ) : (
                  t('updatePassword')
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
