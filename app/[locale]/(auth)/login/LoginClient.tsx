// app/(auth)/login/LoginClient.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Chrome, Mail, Loader2 } from 'lucide-react';

export default function LoginClient() {
  const t = useTranslations('auth.login');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(oauthError ? t('oauthError') : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(t('invalidCredentials'));
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError(t('genericError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    try {
      if (provider === 'google') setIsGoogleLoading(true);
      if (provider === 'github') setIsGithubLoading(true);

      await signIn(provider, { callbackUrl });
    } catch (err) {
      console.error('Error signing in with OAuth:', err);
      setError(t('oauthError'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('signInWithEmail')}
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('orContinueWith')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isGoogleLoading || isGithubLoading}
            >
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              {t('google')}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isGoogleLoading || isGithubLoading}
            >
              {isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
              {t('github')}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-primary hover:underline">
              {tc('signUp')}
            </Link>
          </div>

          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
            {t('forgotPassword')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
