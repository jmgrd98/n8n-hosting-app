'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronDown, ChevronRight, Trash2, Plus, Shield } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';

type Permission =
  | 'CREATE_INSTANCE'
  | 'VIEW_BILLING'
  | 'MANAGE_BILLING'
  | 'VIEW_WORKFLOWS'
  | 'CREATE_WORKFLOW'
  | 'DELETE_WORKFLOW'
  | 'MANAGE_API_KEYS'
  | 'START_STOP_INSTANCE'
  | 'DELETE_INSTANCE';

const GLOBAL_PERMISSIONS: Permission[] = ['CREATE_INSTANCE', 'VIEW_BILLING', 'MANAGE_BILLING'];
const INSTANCE_PERMISSIONS: Permission[] = [
  'VIEW_WORKFLOWS',
  'CREATE_WORKFLOW',
  'DELETE_WORKFLOW',
  'MANAGE_API_KEYS',
  'START_STOP_INSTANCE',
  'DELETE_INSTANCE',
];

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  globalPermissions: Permission[];
  instanceCount: number;
}

interface InstanceGrant {
  instanceId: string;
  instanceName: string;
  instanceStatus: string;
  permissions: Permission[];
}

interface UserRowProps {
  user: User;
}

function UserRow({ user }: UserRowProps) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  const [globalPerms, setGlobalPerms] = useState<Permission[]>(user.globalPermissions);
  const [grants, setGrants] = useState<InstanceGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [allInstances, setAllInstances] = useState<{ id: string; name: string }[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [newPerms, setNewPerms] = useState<Permission[]>([]);
  const [savingGrant, setSavingGrant] = useState(false);

  const fetchGrants = useCallback(async () => {
    setLoadingGrants(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/instance-permissions`);
      const data = await res.json();
      setGrants(data.grants ?? []);
    } finally {
      setLoadingGrants(false);
    }
  }, [user.id]);

  const fetchAllInstances = useCallback(async () => {
    const res = await fetch('/api/instances');
    const data = await res.json();
    setAllInstances((data.instances ?? []).map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })));
  }, []);

  useEffect(() => {
    if (open && grants.length === 0) {
      fetchGrants();
    }
  }, [open, grants.length, fetchGrants]);

  const toggleGlobalPerm = async (perm: Permission, checked: boolean) => {
    const next = checked ? [...globalPerms, perm] : globalPerms.filter(p => p !== perm);
    setGlobalPerms(next);
    setSavingGlobal(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/global-permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(t('permissionSaved'));
    } catch {
      toast.error(t('permissionSaveError'));
      setGlobalPerms(globalPerms); // revert
    } finally {
      setSavingGlobal(false);
    }
  };

  const toggleInstancePerm = async (grant: InstanceGrant, perm: Permission, checked: boolean) => {
    const next = checked
      ? [...grant.permissions, perm]
      : grant.permissions.filter(p => p !== perm);

    const updated = grants.map(g =>
      g.instanceId === grant.instanceId ? { ...g, permissions: next } : g
    );
    setGrants(updated);

    const res = await fetch(`/api/admin/users/${user.id}/instance-permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: grant.instanceId, permissions: next }),
    });
    if (!res.ok) {
      toast.error(t('permissionSaveError'));
      fetchGrants();
    } else {
      toast.success(t('permissionSaved'));
    }
  };

  const revokeGrant = async (instanceId: string) => {
    setGrants(prev => prev.filter(g => g.instanceId !== instanceId));
    const res = await fetch(
      `/api/admin/users/${user.id}/instance-permissions?instanceId=${instanceId}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      toast.error(t('permissionSaveError'));
      fetchGrants();
    } else {
      toast.success(t('revokeSuccess'));
    }
  };

  const openGrantDialog = () => {
    setNewPerms([]);
    setSelectedInstance('');
    fetchAllInstances();
    setGrantDialogOpen(true);
  };

  const saveGrant = async () => {
    if (!selectedInstance) return;
    setSavingGrant(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/instance-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: selectedInstance, permissions: newPerms }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('grantSuccess'));
      setGrantDialogOpen(false);
      fetchGrants();
    } catch {
      toast.error(t('permissionSaveError'));
    } finally {
      setSavingGrant(false);
    }
  };

  if (user.role === 'ADMIN') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border">
        <UserAvatar name={user.name} email={user.email} image={user.image} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{user.name ?? user.email}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        <Badge className="bg-purple-600 text-white">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
        <span className="text-sm text-muted-foreground">{t('adminFullAccess')}</span>
      </div>
    );
  }

  return (
    <>
      <div>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
            <UserAvatar name={user.name} email={user.email} image={user.image} size={40} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name ?? user.email}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="outline">{user.instanceCount} {t('instances')}</Badge>
            <Badge variant="secondary">User</Badge>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>

        {open && (
          <div className="ml-4 mt-2 mb-4 space-y-4">
            {/* Global Permissions */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{t('globalPermissions')}</h4>
                {savingGlobal && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="space-y-2">
                {GLOBAL_PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={globalPerms.includes(perm)}
                      onCheckedChange={(checked) => toggleGlobalPerm(perm, !!checked)}
                      disabled={savingGlobal}
                    />
                    <span className="text-sm">{t(`permissions.${perm}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Instance Permissions */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{t('instancePermissions')}</h4>
                <Button size="sm" variant="outline" onClick={openGrantDialog}>
                  <Plus className="w-3 h-3 mr-1" />
                  {t('grantAccess')}
                </Button>
              </div>

              {loadingGrants ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('loading')}
                </div>
              ) : grants.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noInstanceGrants')}</p>
              ) : (
                <div className="space-y-3">
                  {grants.map(grant => (
                    <div key={grant.instanceId} className="rounded border p-3 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">{grant.instanceName}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{grant.instanceStatus}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7"
                          onClick={() => revokeGrant(grant.instanceId)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {t('revoke')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {INSTANCE_PERMISSIONS.map(perm => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={grant.permissions.includes(perm)}
                              onCheckedChange={(checked) => toggleInstancePerm(grant, perm, !!checked)}
                            />
                            <span className="text-xs">{t(`permissions.${perm}`)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grant Access Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('grantAccess')}</DialogTitle>
            <DialogDescription>{t('grantAccessDescription', { name: user.name ?? user.email })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('selectInstance')}</label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectInstancePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {allInstances.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('selectPermissions')}</label>
              <div className="grid grid-cols-2 gap-2">
                {INSTANCE_PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={newPerms.includes(perm)}
                      onCheckedChange={(checked) =>
                        setNewPerms(prev => checked ? [...prev, perm] : prev.filter(p => p !== perm))
                      }
                    />
                    <span className="text-sm">{t(`permissions.${perm}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGrant} disabled={!selectedInstance || savingGrant}>
              {savingGrant ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('grantAccess')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminPanel() {
  const t = useTranslations('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => setUsers(data.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('noUsers')}</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <UserRow key={user.id} user={user} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
