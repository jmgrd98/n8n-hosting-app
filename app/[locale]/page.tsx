// app/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Check,
  Cloud,
  Code2,
  Database,
  Globe,
  Rocket,
  Server,
  Settings2,
  Shield,
  Play,
  Activity,
  GitBranch,
  Cpu,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

// Lazy load 3D components — no SSR, loaded only on client
const HeroScene = dynamic(() => import('@/components/three/hero-scene'), {
  ssr: false,
  loading: () => null,
});
const WaveGrid = dynamic(() => import('@/components/three/wave-grid'), {
  ssr: false,
  loading: () => null,
});
const FloatingShapes = dynamic(() => import('@/components/three/floating-shapes'), {
  ssr: false,
  loading: () => null,
});
const ParticleConstellation = dynamic(() => import('@/components/three/particle-constellation'), {
  ssr: false,
  loading: () => null,
});
const WireframeGlobe = dynamic(() => import('@/components/three/wireframe-globe'), {
  ssr: false,
  loading: () => null,
});

export default function LandingPage() {
  const t = useTranslations('landing');
  const tc = useTranslations('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: Cloud, gradient: 'from-violet-500 to-purple-600', titleKey: 'oneClickDeploy' },
    { icon: Shield, gradient: 'from-blue-500 to-indigo-600', titleKey: 'security' },
    { icon: Cpu, gradient: 'from-emerald-500 to-teal-600', titleKey: 'autoScaling' },
    { icon: Database, gradient: 'from-purple-500 to-fuchsia-600', titleKey: 'database' },
    { icon: Activity, gradient: 'from-rose-500 to-pink-600', titleKey: 'monitoring' },
    { icon: Globe, gradient: 'from-amber-500 to-orange-600', titleKey: 'customDomain' },
  ];

  const steps = [
    { icon: Settings2, num: '01' },
    { icon: Server, num: '02' },
    { icon: Code2, num: '03' },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass shadow-lg shadow-black/5 dark:shadow-black/20'
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <GitBranch className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-xl gradient-primary opacity-40 blur-lg" />
              </div>
              <span className="text-xl font-bold gradient-text">
                {t('brand')}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {['features', 'howItWorks', 'pricing', 'resources'].map((item) => (
                <Link
                  key={item}
                  href={`#${item === 'howItWorks' ? 'how-it-works' : item}`}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
                >
                  {t(`nav.${item}`)}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {tc('signIn')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gradient-primary text-white shadow-md hover:shadow-lg transition-shadow">
                  {tc('startFreeTrial')}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
              <div className="flex flex-col gap-1">
                {['features', 'howItWorks', 'pricing', 'resources'].map((item) => (
                  <Link
                    key={item}
                    href={`#${item === 'howItWorks' ? 'how-it-works' : item}`}
                    className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t(`nav.${item}`)}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start">{tc('signIn')}</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full gradient-primary text-white">{tc('startFreeTrial')}</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 lg:pt-40 pb-20 lg:pb-32" style={{ isolation: 'isolate' }}>
        {/* 3D Scene — morphing blob behind content */}
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>

        {/* Fallback mesh gradient for before 3D loads */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 dark:from-violet-600/10 dark:to-fuchsia-600/10 blur-[120px] animate-mesh" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-400/15 to-cyan-400/15 dark:from-blue-600/10 dark:to-cyan-600/10 blur-[100px] animate-mesh-alt" />
        </div>

        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-40" style={{ zIndex: 0 }} />

        <div className="container mx-auto px-6 relative" style={{ zIndex: 2 }}>
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex animate-fade-up" style={{ animationDelay: '0ms' }}>
              <Badge variant="outline" className="glass-card px-4 py-1.5 text-sm font-medium border-primary/20 gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t('hero.badge')}
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="mt-8 text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-up" style={{ animationDelay: '100ms' }}>
              <span className="text-foreground">{t('hero.titleLine1')}</span>
              <br />
              <span className="gradient-text">{t('hero.titleLine2')}</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '300ms' }}>
              <Link href="/register">
                <Button size="lg" className="gradient-primary text-white px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] glow-sm">
                  <Rocket className="mr-2 h-5 w-5" />
                  {t('hero.launchInstance')}
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="h-12 text-base glass-card border-border/50 hover:border-primary/30">
                  <Play className="mr-2 h-5 w-5" />
                  {t('hero.watchDemo')}
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '400ms' }}>
              {['noCreditCard', 'fiveMinSetup', 'cancelAnytime'].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{t(`hero.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 lg:py-36" style={{ isolation: 'isolate' }}>
        {/* 3D wave grid background */}
        <Suspense fallback={null}>
          <WaveGrid />
        </Suspense>
        <div className="absolute inset-0 line-grid opacity-40" style={{ zIndex: 0 }} />

        <div className="container mx-auto px-6 relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-16 lg:mb-20">
            <Badge variant="outline" className="mb-6 text-xs uppercase tracking-wider px-3 py-1">
              {t('features.title')}
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              {t('features.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="group glass-card rounded-2xl p-6 relative overflow-hidden"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Subtle gradient accent on hover */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${feature.gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 blur-2xl transition-opacity duration-500 rounded-full -translate-y-1/2 translate-x-1/2`} />

                  <div className={`w-11 h-11 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {t(`features.${feature.titleKey}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`features.${feature.titleKey}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-24 lg:py-36" style={{ isolation: 'isolate' }}>
        {/* 3D floating wireframe shapes */}
        <Suspense fallback={null}>
          <FloatingShapes />
        </Suspense>

        {/* Background accents */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-400/5 to-fuchsia-400/5 dark:from-violet-600/5 dark:to-fuchsia-600/5 blur-[80px]" />
        </div>

        <div className="container mx-auto px-6 relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-16 lg:mb-20">
            <Badge variant="outline" className="mb-6 text-xs uppercase tracking-wider px-3 py-1">
              {t('howItWorks.title')}
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              {t('howItWorks.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {steps.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <div key={i} className="glass-card rounded-2xl p-6 flex gap-6 items-start group">
                    {/* Step number */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg group-hover:glow-sm transition-shadow">
                        <span className="text-white font-bold text-lg font-mono">{step.num}</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold mb-2">{t(`howItWorks.step${i + 1}.title`)}</h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        {t(`howItWorks.step${i + 1}.description`)}
                      </p>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/50 dark:bg-accent/30 border border-border/50">
                        <StepIcon className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {t(`howItWorks.step${i + 1}.detail`)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Link href="/register">
                <Button size="lg" className="gradient-primary text-white px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                  {t('howItWorks.getStarted')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 lg:py-36" style={{ isolation: 'isolate' }}>
        {/* 3D particle constellation */}
        <Suspense fallback={null}>
          <ParticleConstellation />
        </Suspense>
        <div className="absolute inset-0 dot-grid opacity-30" style={{ zIndex: 0 }} />

        <div className="container mx-auto px-6 relative" style={{ zIndex: 2 }}>
          <div className="text-center mb-16 lg:mb-20">
            <Badge variant="outline" className="mb-6 text-xs uppercase tracking-wider px-3 py-1">
              Pricing
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              {t('pricing.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {/* Starter Plan */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold">{t('pricing.starter.name')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('pricing.starter.description')}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {['cpu', 'storage', 'executions', 'support'].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>{t(`pricing.starter.features.${feat}`)}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11 glass-card border-border/50 hover:border-primary/30">
                {tc('startFreeTrial')}
              </Button>
            </div>

            {/* Professional Plan — Featured */}
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 dark:from-violet-500/10 dark:to-fuchsia-500/10 rounded-[1.25rem] blur-lg" />

              <div className="relative glass-card rounded-2xl p-6 border-primary/30 dark:border-primary/20">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-primary text-white shadow-md px-4 py-1">
                    {t('pricing.professional.mostPopular')}
                  </Badge>
                </div>
                <div className="mb-6 mt-2">
                  <h3 className="text-xl font-semibold">{t('pricing.professional.name')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t('pricing.professional.description')}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold gradient-text">{/* keep inline */}$149</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {['cpu', 'storage', 'executions', 'support', 'domain'].map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span>{t(`pricing.professional.features.${feat}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-11 gradient-primary text-white shadow-md hover:shadow-lg transition-shadow">
                  {tc('startFreeTrial')}
                </Button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold">{t('pricing.enterprise.name')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('pricing.enterprise.description')}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{t('pricing.enterprise.price')}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {['resources', 'storage', 'executions', 'support', 'sla'].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>{t(`pricing.enterprise.features.${feat}`)}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11 glass-card border-border/50 hover:border-primary/30">
                {tc('contactSales')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-36">
        <div className="container mx-auto px-6">
          <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl" style={{ isolation: 'isolate' }}>
            {/* Background gradient */}
            <div className="absolute inset-0 gradient-primary" style={{ zIndex: 0 }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" style={{ zIndex: 0 }} />

            {/* 3D wireframe globe */}
            <Suspense fallback={null}>
              <WireframeGlobe />
            </Suspense>

            {/* Mesh pattern */}
            <div className="absolute inset-0 dot-grid opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', zIndex: 0 }} />

            <div className="p-12 lg:p-20 text-center text-white relative" style={{ zIndex: 2 }}>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">
                {t('cta.title')}
              </h2>
              <p className="text-lg mb-10 text-white/80 max-w-xl mx-auto">
                {t('cta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-violet-700 hover:bg-white/90 h-12 px-8 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]">
                    {t('cta.startTrial')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8 text-base backdrop-blur-sm">
                    {t('cta.talkToSales')}
                  </Button>
                </Link>
              </div>
              <p className="mt-8 text-sm text-white/50">
                {t('cta.notice')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-accent/30 dark:to-accent/10" />

        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
                  <GitBranch className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-bold text-lg">{t('brand')}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('footer.tagline')}
              </p>
            </div>

            {[
              { title: 'product', links: ['features', 'pricing', 'documentation', 'changelog'] },
              { title: 'company', links: ['about', 'blog', 'contact', 'careers'] },
              { title: 'legal', links: ['privacy', 'terms', 'security', 'compliance'] },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">
                  {t(`footer.${section.title}`)}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link
                        href={`/${link}`}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t(`footer.${link}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-6">
              {['twitter', 'github', 'linkedin'].map((social) => (
                <Link
                  key={social}
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t(`footer.${social}`)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
