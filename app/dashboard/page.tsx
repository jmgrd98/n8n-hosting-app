// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Server, 
  // Activity, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink, 
  AlertCircle,
  MoreVertical,
  RefreshCw,
  Clock,
  DollarSign,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { CreateInstanceDialog } from '@/components/create-instance-dialog';

interface Instance {
  id: string;
  name: string;
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'DESTROYING';
  config: {
    version: string;
    size: string;
    region: string;
  };
  access?: {
    url?: string;
  };
  createdAt: string;
  billing?: {
    monthlyCharge: number;
  };
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch instances
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
      console.log('Fetched instances:', data);
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
      setError('Failed to load instances. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (session?.user?.id) {
      console.log('Session user ID:', session.user.id);
      fetchInstances();
    }
  }, [session, sessionStatus, router]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInstances();
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleInstanceAction = async (instanceId: string, action: 'start' | 'stop' | 'delete') => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} instance`);
      }
      
      // Refresh instances
      fetchInstances();
    } catch (error) {
      console.error(`Error ${action}ing instance:`, error);
      setError(`Failed to ${action} instance. Please try again.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500';
      case 'STOPPED': return 'bg-gray-500';
      case 'PROVISIONING': return 'bg-blue-500';
      case 'FAILED': return 'bg-red-500';
      case 'DESTROYING': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <Badge variant="outline" className="capitalize">
        <span className={`w-2 h-2 rounded-full ${color} mr-2`} />
        {status.toLowerCase()}
      </Badge>
    );
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading your instances...</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = instances.reduce((sum, instance) => 
    sum + (instance.billing?.monthlyCharge || 0), 0
  );

  const runningInstances = instances.filter(i => i.status === 'RUNNING').length;
  const stoppedInstances = instances.filter(i => i.status === 'STOPPED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">n8n Cloud Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-sm font-medium">
                  Instances
                </Link>
                <Link href="/dashboard/billing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Billing
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Settings
                </Link>
              </nav>
            </div>
            
            {/* User Menu */}
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
          </h2>
          <p className="text-gray-600">
            Manage your n8n instances and monitor their performance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Instances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{instances.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Running</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{runningInstances}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stopped</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stoppedInstances}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Instances Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Your Instances</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Instance
              </Button>
            </div>
          </div>

          {instances.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No instances yet</h3>
                <p className="text-gray-600 mb-4">
                  Deploy your first n8n instance to get started with workflow automation.
                </p>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Instance
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {instance.config.size} • {instance.config.region} • v{instance.config.version}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(instance.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {instance.status === 'RUNNING' && (
                              <>
                                <DropdownMenuItem onClick={() => handleInstanceAction(instance.id, 'stop')}>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Stop Instance
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/instances/${instance.id}`}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                  </Link>
                                </DropdownMenuItem>
                              </>
                            )}
                            {instance.status === 'STOPPED' && (
                              <DropdownMenuItem onClick={() => handleInstanceAction(instance.id, 'start')}>
                                <Play className="w-4 h-4 mr-2" />
                                Start Instance
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleInstanceAction(instance.id, 'delete')}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Instance
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Created {new Date(instance.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${instance.billing?.monthlyCharge || 0}/month
                        </div>
                      </div>
                      {instance.status === 'RUNNING' && instance.access?.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={instance.access.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open n8n
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Instance Dialog */}
      <CreateInstanceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchInstances}
      />
    </div>
  );
}