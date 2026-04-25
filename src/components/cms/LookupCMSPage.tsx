import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LookupPageProps {
  table: 'positions' | 'departments' | 'projects' | 'teams';
  title: string;
  singular: string;
  withDepartment?: boolean;
}

export const LookupCMSPage: React.FC<LookupPageProps> = ({ table, title, singular, withDepartment }) => {
  const empty: any = { name: '', description: '', display_order: 0, is_active: true };
  if (withDepartment) empty.department_id = null;

  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await (db as any).from(table).select('*').order('display_order');
    setItems(data || []);
    if (withDepartment) {
      const { data: deps } = await (db as any).from('departments').select('id,name').order('display_order');
      setDepartments(deps || []);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.name?.trim()) { toast.error('Name required'); return; }
    const payload = { ...editing };
    if (editing.id) {
      delete payload.id;
      delete payload.created_at;
      const { error } = await (db as any).from(table).update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await (db as any).from(table).insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved');
    setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    const { error } = await (db as any).from(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title={title}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add {singular}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} {singular}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                {withDepartment && (
                  <div>
                    <Label>Department</Label>
                    <Select value={editing.department_id || ''} onValueChange={(v) => setEditing({ ...editing, department_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Display Order</Label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.display_order}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.description}</TableCell>
                <TableCell>{s.is_active ? '✓' : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};
