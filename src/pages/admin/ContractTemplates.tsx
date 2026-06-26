import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { Navigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Edit, Loader2 } from 'lucide-react';

const empty = { title: '', role_name: '', position_id: '', body_html: '', is_active: true };

export default function ContractTemplates() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      db.from('contract_templates').select('*').order('created_at', { ascending: false }),
      db.from('positions').select('id, name').eq('is_active', true).order('name'),
    ]);
    setItems((t as any[]) || []);
    setPositions((p as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (authLoading) return null;
  if (role && role !== 'admin') return <Navigate to="/dashboard" replace />;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      role_name: item.role_name || '',
      position_id: item.position_id || '',
      body_html: item.body_html || '',
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload: any = {
      title: form.title,
      role_name: form.role_name,
      position_id: form.position_id || null,
      body_html: form.body_html,
      is_active: form.is_active,
      created_by: user?.id,
    };
    const { error } = editing
      ? await db.from('contract_templates').update(payload).eq('id', editing.id)
      : await db.from('contract_templates').insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Template updated' : 'Template created' });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await db.from('contract_templates').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <DashboardLayout title="Contract Templates">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Contract Templates</h1>
            <p className="text-sm text-muted-foreground">Define reusable employment contracts scoped by role or position.</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New template</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No templates yet. Create one to streamline candidate offers.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {items.map((it) => {
              const pos = positions.find((p) => p.id === it.position_id);
              return (
                <Card key={it.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div>
                      <CardTitle className="text-base">{it.title}</CardTitle>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {pos && <Badge variant="outline" className="text-xs">{pos.name}</Badge>}
                        {it.role_name && <Badge variant="outline" className="text-xs">{it.role_name}</Badge>}
                        <Badge variant={it.is_active ? 'default' : 'secondary'} className="text-xs">{it.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{it.body_html || 'No body content.'}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Field Officer Employment Contract" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Position</Label>
                  <Select value={form.position_id || 'none'} onValueChange={(v) => setForm({ ...form, position_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Any position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any position</SelectItem>
                      {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role label (free text)</Label>
                  <Input value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} placeholder="e.g. Field Officer" />
                </div>
              </div>
              <div>
                <Label>Contract body</Label>
                <Textarea rows={12} value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} placeholder="Paste the contract text here. Use {{name}}, {{position}}, {{start_date}} as placeholders." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <span>Active (available when assigning to candidates)</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
