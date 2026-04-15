import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase-db';
import { ALL_CAPABILITIES } from '@/hooks/useCapabilities';
import { Plus, Edit, Trash2, Shield, Lock } from 'lucide-react';

const SYSTEM_ROLE_NAMES = ['Admin', 'Employee', 'Guest', 'Candidate'];

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  created_at: string;
  updated_at: string;
}

interface RoleManagementProps {
  onRolesChange?: () => void;
}

const RoleManagement = ({ onRolesChange }: RoleManagementProps) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capabilities: [] as string[]
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('custom_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openDialog = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        capabilities: Array.isArray(role.capabilities) ? role.capabilities : []
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', capabilities: [] });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        capabilities: formData.capabilities,
        updated_at: new Date().toISOString()
      };

      if (editingRole) {
        const { error } = await db
          .from('custom_roles')
          .update(payload)
          .eq('id', editingRole.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Role updated successfully' });
      } else {
        const { error } = await db
          .from('custom_roles')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Role created successfully' });
      }

      setDialogOpen(false);
      fetchRoles();
      onRolesChange?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save role', variant: 'destructive' });
    }
  };

  const handleDelete = async (role: CustomRole) => {
    if (SYSTEM_ROLE_NAMES.includes(role.name)) {
      toast({ title: 'Cannot delete', description: 'System roles cannot be deleted', variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure you want to delete this role template?')) return;

    try {
      const { error } = await db
        .from('custom_roles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Role deleted' });
      fetchRoles();
      onRolesChange?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete role', variant: 'destructive' });
    }
  };

  const toggleCapability = (capId: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capId)
        ? prev.capabilities.filter(c => c !== capId)
        : [...prev.capabilities, capId]
    }));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Templates
          </CardTitle>
          <Button onClick={() => openDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom roles yet. Create one to define reusable capability sets.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {Array.isArray(role.capabilities) ? role.capabilities.length : 0} capabilities
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(role.id)}>
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Finance Manager"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role is for..."
                rows={2}
              />
            </div>
            <div>
              <Label className="mb-3 block">Capabilities ({formData.capabilities.length} selected)</Label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                {ALL_CAPABILITIES.map((cap) => (
                  <div key={cap.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={formData.capabilities.includes(cap.id)}
                      onCheckedChange={() => toggleCapability(cap.id)}
                    />
                    <div>
                      <p className="font-medium text-sm">{cap.label}</p>
                      <p className="text-xs text-muted-foreground">{cap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingRole ? 'Update' : 'Create'} Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleManagement;
export { RoleManagement };
