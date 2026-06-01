import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { ALL_CAPABILITIES } from '@/hooks/useCapabilities';
import RoleManagement, { CustomRole } from '@/components/RoleManagement';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Plus, Edit, RefreshCw, Shield, Eye, EyeOff, ArrowLeft, Copy, Check, X, Search, MoreHorizontal, UserCheck, UserX, Clock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  passcode: string | null;
  is_active: boolean;
  role: 'admin' | 'employee' | 'guest';
  capabilities: string[];
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  last_sign_in_at?: string | null;
  last_seen_at?: string | null;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [capabilitiesDialogOpen, setCapabilitiesDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPasscode, setShowPasscode] = useState<Record<string, boolean>>({});
  const [createdPasscode, setCreatedPasscode] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'employee' | 'guest'>('all');
  const [search, setSearch] = useState('');

  // Create user form
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'employee' as 'admin' | 'employee' | 'guest'
  });

  // Edit user form
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'employee' as 'admin' | 'employee' | 'guest',
    is_active: true,
    new_password: '',
    manager_id: '' as string
  });
  const [managerOptions, setManagerOptions] = useState<{ id: string; full_name: string | null }[]>([]);

  useEffect(() => {
    if (role && role !== 'admin') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('get-users', {
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      setUsers(response.data.users || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomRoles = async () => {
    try {
      const { data, error } = await db.from('custom_roles').select('*').order('name');
      if (error) throw error;
      setCustomRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch custom roles:', error);
    }
  };

  useEffect(() => {
    if (role === 'admin') {
      fetchUsers();
      fetchCustomRoles();
    }
  }, [role]);

  const handleCreateUser = async () => {
    if (newUser.password !== newUser.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      setCreatedPasscode(response.data.passcode);
      toast({ title: 'User Created', description: `User ${newUser.email} created successfully` });
      
      setNewUser({ email: '', password: '', confirmPassword: '', full_name: '', role: 'employee' });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user', {
        body: {
          user_id: selectedUser.id,
          full_name: editForm.full_name,
          role: editForm.role,
          is_active: editForm.is_active,
          new_password: editForm.new_password || undefined,
          manager_id: editForm.manager_id || null,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({ title: 'User Updated', description: 'User details updated successfully' });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleRegeneratePasscode = async (userId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user', {
        body: { user_id: userId, regenerate_passcode: true },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      toast({ title: 'Passcode Regenerated', description: `New passcode: ${response.data.passcode}` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to regenerate passcode', variant: 'destructive' });
    }
  };

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('approve-user', {
        body: { user_id: userId, action },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` }
      });
      if (response.error) throw response.error;
      toast({
        title: action === 'approve' ? 'User Approved' : 'User Rejected',
        description: action === 'approve'
          ? 'Access code generated and shared. The user can now log in.'
          : 'User has been rejected.'
      });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Action failed', variant: 'destructive' });
    }
  };

  const handleCapabilityToggle = async (userId: string, capability: string, enabled: boolean) => {
    try {
      if (enabled) {
        await supabase
          .from('user_capabilities')
          .insert({ user_id: userId, capability });
      } else {
        await supabase
          .from('user_capabilities')
          .delete()
          .eq('user_id', userId)
          .eq('capability', capability);
      }

      toast({
        title: enabled ? 'Capability Added' : 'Capability Removed',
        description: `${capability} ${enabled ? 'granted to' : 'removed from'} user`
      });

      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update capability', variant: 'destructive' });
    }
  };

  const handleApplyRoleTemplate = async (roleId: string) => {
    if (!selectedUser) return;
    const customRole = customRoles.find(r => r.id === roleId);
    if (!customRole) return;

    const caps = Array.isArray(customRole.capabilities) ? customRole.capabilities : [];
    
    try {
      // Remove all existing capabilities
      await supabase
        .from('user_capabilities')
        .delete()
        .eq('user_id', selectedUser.id);

      // Insert new capabilities from template
      if (caps.length > 0) {
        const inserts = caps.map((cap: string) => ({
          user_id: selectedUser.id,
          capability: cap
        }));
        const { error } = await (supabase as any)
          .from('user_capabilities')
          .insert(inserts);
        if (error) throw error;
      }

      toast({
        title: 'Role Template Applied',
        description: `Applied "${customRole.name}" template with ${caps.length} capabilities`
      });

      // Update local state
      setSelectedUser({ ...selectedUser, capabilities: caps });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to apply template', variant: 'destructive' });
    }
  };

  const openEditDialog = async (user: User) => {
    setSelectedUser(user);
    // Load current manager_id from profile and the list of potential managers
    const [{ data: prof }, { data: profs }] = await Promise.all([
      (supabase as any).from('profiles').select('manager_id').eq('id', user.id).maybeSingle(),
      (supabase as any).from('profiles').select('id, full_name').neq('id', user.id).order('full_name'),
    ]);
    setManagerOptions(profs || []);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      new_password: '',
      manager_id: prof?.manager_id || ''
    });
    setEditDialogOpen(true);
  };

  const openCapabilitiesDialog = (user: User) => {
    setSelectedUser(user);
    setCapabilitiesDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Passcode copied to clipboard' });
  };

  if (role !== 'admin') return null;

  const pendingUsers = users.filter(u => (u.approval_status || 'approved') === 'pending');
  const counts = {
    total: users.length,
    pending: pendingUsers.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'all' && (u.approval_status || 'approved') !== statusFilter) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(u.full_name || '').toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const StatTile = ({ label, value, icon: Icon, tone, onClick, active }: any) => (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors flex items-center gap-3 ${active ? 'ring-2 ring-primary' : ''}`}
    >
      <div className={`p-2 rounded-md ${tone}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </button>
  );

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="-ml-2 mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Button>
            <h2 className="text-2xl font-semibold tracking-tight">User Management</h2>
            <p className="text-sm text-muted-foreground">Approve members, manage roles, and reset access codes.</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setCreatedPasscode(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              {createdPasscode ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg border">
                    <p className="text-sm mb-2">User created successfully!</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold">{createdPasscode}</span>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdPasscode)}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Share this access code with the user. They will need it to log in.</p>
                  </div>
                  <Button onClick={() => { setCreateDialogOpen(false); setCreatedPasscode(null); }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><Label>Email</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" /></div>
                  <div><Label>Full Name</Label><Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="John Doe" /></div>
                  <div><Label>Password</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" /></div>
                  <div><Label>Confirm Password</Label><Input type="password" value={newUser.confirmPassword} onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} placeholder="••••••••" /></div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter><Button onClick={handleCreateUser} className="w-full">Create User</Button></DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="roles" className="gap-2"><Shield className="h-4 w-4" /> Role Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Total users" value={counts.total} icon={Users} tone="bg-primary/10 text-primary"
                onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
              <StatTile label="Pending approval" value={counts.pending} icon={Clock} tone="bg-orange-500/10 text-orange-500"
                onClick={() => setStatusFilter('pending')} active={statusFilter === 'pending'} />
              <StatTile label="Active" value={counts.active} icon={UserCheck} tone="bg-primary/10 text-primary"
                onClick={() => setStatusFilter('approved')} active={statusFilter === 'approved'} />
              <StatTile label="Inactive" value={counts.inactive} icon={UserX} tone="bg-destructive/10 text-destructive"
                onClick={() => setStatusFilter('rejected')} active={statusFilter === 'rejected'} />
            </div>

            {/* Pending approvals card */}
            {pendingUsers.length > 0 && (
              <Card className="border-orange-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-orange-500" /> Pending Approvals
                    <Badge variant="secondary">{pendingUsers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40 border">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email} · {u.role}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleApproval(u.id, 'approve')}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleApproval(u.id, 'reject')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
              </div>
              <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> All Users <Badge variant="secondary">{filteredUsers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">No users match the current filters.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last login</TableHead>
                        <TableHead>Passcode</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => {
                        const status = u.approval_status || 'approved';
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{u.full_name || '—'}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? 'default' : u.role === 'employee' ? 'secondary' : 'outline'}>{u.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {status === 'pending' ? (
                                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
                              ) : status === 'rejected' ? (
                                <Badge variant="destructive">Rejected</Badge>
                              ) : u.is_active ? (
                                <Badge variant="default" className="gap-1"><UserCheck className="h-3 w-3" /> Active</Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1"><UserX className="h-3 w-3" /> Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{showPasscode[u.id] ? (u.passcode || 'Not set') : '••••••••'}</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowPasscode({ ...showPasscode, [u.id]: !showPasscode[u.id] })}>
                                      {showPasscode[u.id] ? <><EyeOff className="h-4 w-4 mr-2" /> Hide</> : <><Eye className="h-4 w-4 mr-2" /> Reveal</>}
                                    </DropdownMenuItem>
                                    {u.passcode && (
                                      <DropdownMenuItem onClick={() => copyToClipboard(u.passcode!)}>
                                        <Copy className="h-4 w-4 mr-2" /> Copy
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleRegeneratePasscode(u.id)}>
                                      <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(u)} title="Edit user"><Edit className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => openCapabilitiesDialog(u)} title="Manage capabilities"><Shield className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement onRolesChange={fetchCustomRoles} />
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(value: any) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direct Manager</Label>
                <Select
                  value={editForm.manager_id || 'none'}
                  onValueChange={(v) => setEditForm({ ...editForm, manager_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select direct manager…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No manager —</SelectItem>
                    {managerOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct managers can view this user's form submissions and analytics.
                </p>
              </div>
              <div>
                <Label>New Password (leave blank to keep current)</Label>
                <Input type="password" value={editForm.new_password} onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_active} onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })} />
                <Label>Account Active</Label>
              </div>
              <DialogFooter>
                <Button onClick={handleEditUser}>Save Changes</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Capabilities Dialog */}
        <Dialog open={capabilitiesDialogOpen} onOpenChange={setCapabilitiesDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Capabilities: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            
            {/* Apply Role Template */}
            {customRoles.length > 0 && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <Label className="text-sm font-medium">Quick Apply: Role Template</Label>
                <div className="flex gap-2">
                  <Select onValueChange={handleApplyRoleTemplate}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a role template to apply..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles.map((cr) => (
                        <SelectItem key={cr.id} value={cr.id}>
                          {cr.name} ({Array.isArray(cr.capabilities) ? cr.capabilities.length : 0} caps)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applying a template replaces all current capabilities with the template's set.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {ALL_CAPABILITIES.map((cap) => (
                <div key={cap.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={selectedUser?.capabilities.includes(cap.id) || false}
                    onCheckedChange={(checked) => {
                      if (selectedUser) {
                        handleCapabilityToggle(selectedUser.id, cap.id, !!checked);
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium text-sm">{cap.label}</p>
                    <p className="text-xs text-muted-foreground">{cap.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
