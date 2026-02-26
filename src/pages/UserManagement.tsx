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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ALL_CAPABILITIES } from '@/hooks/useCapabilities';
import { Users, Plus, Edit, RefreshCw, Shield, Eye, EyeOff, ArrowLeft, Copy } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  passcode: string | null;
  is_active: boolean;
  role: 'admin' | 'employee' | 'guest';
  capabilities: string[];
  created_at: string;
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
    new_password: ''
  });

  // Redirect if not admin
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin') {
      fetchUsers();
    }
  }, [role]);

  const handleCreateUser = async () => {
    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
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
      toast({
        title: 'User Created',
        description: `User ${newUser.email} created successfully`
      });
      
      setNewUser({ email: '', password: '', confirmPassword: '', full_name: '', role: 'employee' });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive'
      });
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
          new_password: editForm.new_password || undefined
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'User Updated',
        description: 'User details updated successfully'
      });
      
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive'
      });
    }
  };

  const handleRegeneratePasscode = async (userId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user', {
        body: {
          user_id: userId,
          regenerate_passcode: true
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Passcode Regenerated',
        description: `New passcode: ${response.data.passcode}`
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate passcode',
        variant: 'destructive'
      });
    }
  };

  const handleCapabilityToggle = async (userId: string, capability: string, enabled: boolean) => {
    try {
      if (enabled) {
        await supabase
          .from('user_capabilities')
          .insert({ user_id: userId, capability, granted_by: user?.id });
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to update capability',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      new_password: ''
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

  if (role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) setCreatedPasscode(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              
              {createdPasscode ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 mb-2">User created successfully!</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold">{createdPasscode}</span>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdPasscode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this access code with the user. They will need it to log in.
                    </p>
                  </div>
                  <Button onClick={() => { setCreateDialogOpen(false); setCreatedPasscode(null); }} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateUser} className="w-full">Create User</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Passcode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'employee' ? 'secondary' : 'outline'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showPasscode[u.id] ? u.passcode : '••••••••'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPasscode({ ...showPasscode, [u.id]: !showPasscode[u.id] })}
                          >
                            {showPasscode[u.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegeneratePasscode(u.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openCapabilitiesDialog(u)}>
                            <Shield className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(value: any) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
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
