'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Shield,
  GitBranch,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserAvatar } from '@/components/user-avatar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('common');
  const td = useTranslations('dashboard');
  const ta = useTranslations('admin');
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync the user's saved theme preference from DB once on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/user/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const saved = data?.preferences?.theme;
        if (saved) setTheme(saved);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  const navItems = [
    { href: '/dashboard', label: t('instances') },
    { href: '/billing', label: t('billing') },
    { href: '/settings', label: t('settings') },
    ...(isAdmin ? [{ href: '/admin', label: ta('title') }] : []),
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/3 blur-[120px]" />
        <div className="dot-grid absolute inset-0 opacity-20" />
      </div>

      {/* Glass navbar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <GitBranch className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold gradient-text hidden sm:block">
                  {td('brand')}
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive(item.href)
                        ? 'text-foreground bg-accent/70'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    {isActive(item.href) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 gradient-primary rounded-full" />
                    )}
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 pl-1.5 hover:bg-accent/50 rounded-xl">
                    <UserAvatar
                      name={session?.user?.name}
                      email={session?.user?.email}
                      image={session?.user?.image}
                      size={28}
                    />
                    <span className="hidden sm:inline text-sm font-medium">
                      {session?.user?.name || session?.user?.email || t('user')}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card">
                  <DropdownMenuLabel className="flex items-center gap-3 p-3">
                    <UserAvatar
                      name={session?.user?.name}
                      email={session?.user?.email}
                      image={session?.user?.image}
                      size={32}
                    />
                    <div className="flex flex-col leading-tight min-w-0">
                      {session?.user?.name && (
                        <span className="text-sm font-medium truncate">{session.user.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        {session?.user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      {ta('title')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2">
                    <Settings className="w-4 h-4" />
                    {t('profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2">
                    <Settings className="w-4 h-4" />
                    {t('settings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 space-y-1 animate-fade-in">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-accent/70 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {children}
    </div>
  );
}
