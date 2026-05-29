import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, ArrowLeft, Edit, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  bank_name: string | null;
  account_number: string | null;
  email: string | null;
  user_id: string | null;
}

interface ProfileLite { id: string; full_name: string | null; email?: string | null; manager_id?: string | null }

const EmployeeManagement = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [linkableUsers, setLinkableUsers] = useState<ProfileLite[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    designation: '',
    bank_name: '',
    account_number: '',
    email: '',
    user_id: '' as string,
    manager_id: '' as string
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchEmployees();
      fetchLinkableUsers();
    }
  }, [user, loading, navigate]);

  const fetchLinkableUsers = async () => {
    // Profiles with employee/admin role
    const { data: roles } = await (supabase as any)
      .from('user_roles')
      .select('user_id')
      .in('role', ['employee', 'admin']);
    const ids = (roles || []).map((r: any) => r.user_id);
    if (!ids.length) { setLinkableUsers([]); return; }
    const { data: profs } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, manager_id')
      .in('id', ids);
    setLinkableUsers(profs || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
      return;
    }
    
    setEmployees(data || []);
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      const linked = linkableUsers.find((p) => p.id === employee.user_id);
      setFormData({
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        designation: employee.designation,
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        email: employee.email || '',
        user_id: employee.user_id || '',
        manager_id: linked?.manager_id || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        employee_id: '',
        full_name: '',
        designation: '',
        bank_name: '',
        account_number: '',
        email: '',
        user_id: '',
        manager_id: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.full_name || !formData.designation) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const userIdValue = formData.user_id || null;
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update({
            employee_id: formData.employee_id,
            full_name: formData.full_name,
            designation: formData.designation,
            bank_name: formData.bank_name || null,
            account_number: formData.account_number || null,
            email: formData.email || null,
            user_id: userIdValue,
            profile_id: userIdValue
          } as any)
          .eq('id', editingEmployee.id);

        if (error) throw error;

        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert({
            employee_id: formData.employee_id,
            full_name: formData.full_name,
            designation: formData.designation,
            bank_name: formData.bank_name || null,
            account_number: formData.account_number || null,
            email: formData.email || null,
            user_id: userIdValue,
            profile_id: userIdValue
          } as any);

        if (error) throw error;

        toast({ title: "Success", description: "Employee added successfully" });
      }

      // Persist direct manager on the linked user's profile (via edge function so admin RLS doesn't block)
      if (userIdValue) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          await supabase.functions.invoke('update-user', {
            body: { user_id: userIdValue, manager_id: formData.manager_id || null },
            headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
          });
        } catch (e: any) {
          toast({ title: 'Manager update failed', description: e.message || 'Could not save manager', variant: 'destructive' });
        }
      }

      setIsDialogOpen(false);
      fetchEmployees();
      fetchLinkableUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save employee",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This will also delete all their payslips.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });

      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/generate-invoice')}
              className="gap-2"
            >
              Generate Invoice
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Employee Management</CardTitle>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Linked User</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee, index) => {
                  const linked = linkableUsers.find((p) => p.id === employee.user_id);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{employee.employee_id}</TableCell>
                      <TableCell>{employee.full_name}</TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>
                        {employee.user_id ? (
                          <Badge variant="secondary" className="gap-1"><Link2 className="h-3 w-3" /> {linked?.full_name || 'Linked'}</Badge>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(employee)}>Link…</Button>
                        )}
                      </TableCell>
                      <TableCell>{employee.bank_name || '-'}</TableCell>
                      <TableCell>{employee.account_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(employee.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No employees found. Add your first employee to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Employee ID *</Label>
                <Input
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="e.g., FDLC202505-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Data Entry Clerk (Virtual)"
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., First Bank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="e.g., 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., employee@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Linked User Account</Label>
                <Select value={formData.user_id || 'none'} onValueChange={(v) => setFormData({ ...formData, user_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not linked —</SelectItem>
                    {linkableUsers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Linking lets the user view their own payslips and activity.</p>
              </div>
              <div className="space-y-2">
                <Label>Direct Manager</Label>
                <Select
                  value={formData.manager_id || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, manager_id: v === 'none' ? '' : v })}
                  disabled={!formData.user_id}
                >
                  <SelectTrigger><SelectValue placeholder="Select direct manager…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No manager —</SelectItem>
                    {linkableUsers
                      .filter((p) => p.id !== formData.user_id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.user_id
                    ? "The direct manager can view this employee's form submissions and analytics."
                    : 'Link a user account first to assign a direct manager.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingEmployee ? 'Update' : 'Add'} Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmployeeManagement;
