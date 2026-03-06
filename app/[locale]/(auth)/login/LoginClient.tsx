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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Chrome, Loader2, GitBranch, ArrowRight } from 'lucide-react';

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
    <div className="flex min-h-screen">
      {/* Left side — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/5" />

        {/* Mesh animation */}
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full bg-white/10 blur-[100px] animate-mesh" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px] animate-mesh-alt" />

        {/* Dot pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
              <GitBranch className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">n8n Cloud</span>
          </div>

          {/* Central message */}
          <div className="space-y-6">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Automate your<br />workflows in<br />minutes.
            </h2>
            <p className="text-white/70 text-lg max-w-sm leading-relaxed">
              Deploy, manage, and scale your n8n instances with enterprise-grade infrastructure.
            </p>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>99.9% uptime</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <span>SOC 2 compliant</span>
              <div className="w-px h-4 bg-white/20" />
              <span>24/7 support</span>
            </div>
          </div>

          {/* Testimonial or stat */}
          <div className="glass rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}>
            <p className="text-white/80 text-sm italic leading-relaxed">
              &ldquo;Migrated our entire automation stack in a single afternoon. The provisioning is incredibly fast.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                JD
              </div>
              <div>
                <div className="text-sm font-medium">Jane Doe</div>
                <div className="text-xs text-white/50">CTO, TechCorp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background relative">
        {/* Subtle background */}
        <div className="absolute inset-0 -z-10 dot-grid opacity-30" />
        <div className="absolute top-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />

        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">n8n Cloud</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-1.5">{t('description')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-scale-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
                disabled={isLoading}
                className="h-11 bg-background border-border/60 focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                disabled={isLoading}
                className="h-11 bg-background border-border/60 focus:border-primary/50 transition-colors"
              />
            </div>

            <Button type="submit" className="w-full h-11 gradient-primary text-white shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                <>
                  {t('signInWithEmail')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground tracking-wider">{t('orContinueWith')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-11 glass-card border-border/50 hover:border-primary/30 transition-all"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isGoogleLoading || isGithubLoading}
            >
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              {t('google')}
            </Button>

            <Button
              variant="outline"
              className="h-11 glass-card border-border/50 hover:border-primary/30 transition-all"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isGoogleLoading || isGithubLoading}
            >
              {isGithubLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
              {t('github')}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              {tc('signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
