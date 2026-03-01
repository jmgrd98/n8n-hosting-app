// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Check,
  Cloud,
  Code2,
  Database,
  Globe,
  // Lock,
  Rocket,
  Server,
  Settings2,
  Shield,
  Zap,
  // ChevronRight,
  Play,
  // Users,
  Activity,
  GitBranch,
  Cpu,
  // HardDrive,
  Menu,
  X
} from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                {t('brand')}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="#features" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t('nav.features')}
              </Link>
              <Link href="#how-it-works" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t('nav.howItWorks')}
              </Link>
              <Link href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t('nav.pricing')}
              </Link>
              <Link href="#resources" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t('nav.resources')}
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {tc('signIn')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-orange-600 to-pink-600 text-white hover:from-orange-700 hover:to-pink-700">
                  {tc('startFreeTrial')}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                <Link href="#features" className="text-slate-600 dark:text-slate-300">{t('nav.features')}</Link>
                <Link href="#how-it-works" className="text-slate-600 dark:text-slate-300">{t('nav.howItWorks')}</Link>
                <Link href="#pricing" className="text-slate-600 dark:text-slate-300">{t('nav.pricing')}</Link>
                <Link href="#resources" className="text-slate-600 dark:text-slate-300">{t('nav.resources')}</Link>
                <div className="flex flex-col space-y-2 pt-4 border-t">
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">{tc('signIn')}</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-gradient-to-r from-orange-600 to-pink-600">{tc('startFreeTrial')}</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <Badge variant="outline" className="mb-6 border-orange-200 bg-orange-50 text-orange-700">
              <Zap className="w-3 h-3 mr-1" />
              {t('hero.badge')}
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {t('hero.titleLine1')}
              <br />
              {t('hero.titleLine2')}
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white px-8">
                  <Rocket className="mr-2 h-5 w-5" />
                  {t('hero.launchInstance')}
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="border-slate-300">
                  <Play className="mr-2 h-5 w-5" />
                  {t('hero.watchDemo')}
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{t('hero.noCreditCard')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{t('hero.fiveMinSetup')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{t('hero.cancelAnytime')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-[100rem] h-[100rem] rounded-full bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20 blur-3xl opacity-30"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-[100rem] h-[100rem] rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 blur-3xl opacity-30"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.oneClickDeploy.title')}</CardTitle>
                <CardDescription>
                  {t('features.oneClickDeploy.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.security.title')}</CardTitle>
                <CardDescription>
                  {t('features.security.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.autoScaling.title')}</CardTitle>
                <CardDescription>
                  {t('features.autoScaling.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.database.title')}</CardTitle>
                <CardDescription>
                  {t('features.database.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.monitoring.title')}</CardTitle>
                <CardDescription>
                  {t('features.monitoring.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{t('features.customDomain.title')}</CardTitle>
                <CardDescription>
                  {t('features.customDomain.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold mb-2">{t('howItWorks.step1.title')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t('howItWorks.step1.description')}
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex items-center gap-4">
                    <Settings2 className="w-6 h-6 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {t('howItWorks.step1.detail')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold mb-2">{t('howItWorks.step2.title')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t('howItWorks.step2.description')}
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex items-center gap-4">
                    <Server className="w-6 h-6 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {t('howItWorks.step2.detail')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold mb-2">{t('howItWorks.step3.title')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {t('howItWorks.step3.description')}
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex items-center gap-4">
                    <Code2 className="w-6 h-6 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {t('howItWorks.step3.detail')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white px-8">
                  {t('howItWorks.getStarted')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.starter.name')}</CardTitle>
                <CardDescription>{t('pricing.starter.description')}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.starter.features.cpu')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.starter.features.storage')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.starter.features.executions')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.starter.features.support')}</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  {tc('startFreeTrial')}
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-2 border-orange-500 hover:border-orange-600 transition-colors relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-orange-600 to-pink-600 text-white">
                  {t('pricing.professional.mostPopular')}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.professional.name')}</CardTitle>
                <CardDescription>{t('pricing.professional.description')}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$149</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.professional.features.cpu')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.professional.features.storage')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.professional.features.executions')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.professional.features.support')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.professional.features.domain')}</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700">
                  {tc('startFreeTrial')}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl">{t('pricing.enterprise.name')}</CardTitle>
                <CardDescription>{t('pricing.enterprise.description')}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{t('pricing.enterprise.price')}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.enterprise.features.resources')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.enterprise.features.storage')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.enterprise.features.executions')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.enterprise.features.support')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{t('pricing.enterprise.features.sla')}</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  {tc('contactSales')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-orange-600 to-pink-600 rounded-3xl p-12 lg:p-16 text-white">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-xl mb-8 text-orange-50">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                  {t('cta.startTrial')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                  {t('cta.talkToSales')}
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-orange-100">
              {t('cta.notice')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">{t('brand')}</span>
              </div>
              <p className="text-sm">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white transition">{t('footer.features')}</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">{t('footer.pricing')}</Link></li>
                <li><Link href="/docs" className="hover:text-white transition">{t('footer.documentation')}</Link></li>
                <li><Link href="/changelog" className="hover:text-white transition">{t('footer.changelog')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition">{t('footer.about')}</Link></li>
                <li><Link href="/blog" className="hover:text-white transition">{t('footer.blog')}</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">{t('footer.contact')}</Link></li>
                <li><Link href="/careers" className="hover:text-white transition">{t('footer.careers')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">{t('footer.terms')}</Link></li>
                <li><Link href="/security" className="hover:text-white transition">{t('footer.security')}</Link></li>
                <li><Link href="/compliance" className="hover:text-white transition">{t('footer.compliance')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              {t('footer.copyright')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition">{t('footer.twitter')}</Link>
              <Link href="#" className="hover:text-white transition">{t('footer.github')}</Link>
              <Link href="#" className="hover:text-white transition">{t('footer.linkedin')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
