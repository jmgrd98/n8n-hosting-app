// app/(dashboard)/dashboard/billing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  CreditCard,
  Download,
  TrendingUp,
  Calendar,
  Server,
  User,
  Settings,
  LogOut,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  status: string;
  config: {
    size: string;
    region: string;
  };
  billing: {
    monthlyCharge: number;
    hourlyRate: number;
    totalUsageHours: number;
  };
  createdAt: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  period: string;
  invoiceNumber: string;
}

export default function BillingPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mock invoice data - replace with actual API call
  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      date: '2025-10-01',
      amount: 198.00,
      status: 'paid',
      period: 'September 2025',
      invoiceNumber: 'INV-2025-09',
    },
    {
      id: '2',
      date: '2025-09-01',
      amount: 149.00,
      status: 'paid',
      period: 'August 2025',
      invoiceNumber: 'INV-2025-08',
    },
    {
      id: '3',
      date: '2025-08-01',
      amount: 99.00,
      status: 'paid',
      period: 'July 2025',
      invoiceNumber: 'INV-2025-07',
    },
  ]);

  const fetchInstances = async () => {
    try {
      setError('');
      const response = await fetch('/api/instances');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch instances');
      }
      
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (session?.user?.id) {
      fetchInstances();
    }
  }, [session, sessionStatus, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = instances.reduce((sum, instance) => 
    sum + (instance.billing?.monthlyCharge || 0), 0
  );

  const currentMonthUsage = instances.reduce((sum, instance) => 
    sum + ((instance.billing?.hourlyRate || 0) * (instance.billing?.totalUsageHours || 0)), 0
  );

  const runningInstances = instances.filter(i => i.status === 'RUNNING').length;

  const getStatusBadge = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">n8n Cloud Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  Instances
                </Link>
                <Link href="/dashboard/billing" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Billing
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                  Settings
                </Link>
              </nav>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {session?.user?.email || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Billing & Usage</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your billing, view invoices, and track your usage.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Current Month Estimate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${currentMonthUsage.toFixed(2)}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Based on {runningInstances} running {runningInstances === 1 ? 'instance' : 'instances'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Monthly Commitment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {instances.length} total {instances.length === 1 ? 'instance' : 'instances'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Next Billing Date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Nov 1</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Payment method: •••• 4242
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage your default payment method
                </CardDescription>
              </div>
              <Button variant="outline">Update</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expires 12/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown by Instance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>Monthly costs by instance</CardDescription>
          </CardHeader>
          <CardContent>
            {instances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active instances
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                      <th className="pb-3 font-medium">Instance Name</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium">Region</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Monthly Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {instances.map((instance) => (
                      <tr key={instance.id} className="text-sm">
                        <td className="py-3 font-medium">{instance.name}</td>
                        <td className="py-3">{instance.config.size}</td>
                        <td className="py-3">{instance.config.region}</td>
                        <td className="py-3">
                          <Badge variant={instance.status === 'RUNNING' ? 'default' : 'secondary'} className="text-xs">
                            {instance.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">
                          ${instance.billing?.monthlyCharge.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-sm">
                      <td colSpan={4} className="py-3">Total</td>
                      <td className="py-3 text-right">
                        ${totalMonthlyCost.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice History
                </CardTitle>
                <CardDescription className="mt-1">
                  View and download your past invoices
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="text-sm">
                      <td className="py-3 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3">{invoice.period}</td>
                      <td className="py-3">
                        {new Date(invoice.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3">{getStatusBadge(invoice.status)}</td>
                      <td className="py-3 text-right font-medium">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Billing Information Notice */}
        <Alert className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All prices are in USD. Billing occurs on the 1st of each month. You can update your payment method or cancel your subscription at any time.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}