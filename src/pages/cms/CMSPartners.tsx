import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from '@/components/cms/ImageUpload';

const empty = { name: '', logo_url: '', website_url: '', display_order: 0, is_published: true };

const CMSPartners = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => { const { data } = await db.from('partners').select('*').order('display_order'); setItems(data || []); };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.name) { toast.error('Name required'); return; }
    if (editing.id) { await db.from('partners').update(editing).eq('id', editing.id); }
    else { await db.from('partners').insert(editing); }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await db.from('partners').delete().eq('id', id); toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title="Manage Partners">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Partners</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Partner</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Partner</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <ImageUpload label="Logo" value={editing.logo_url || ''} onChange={(url) => setEditing({ ...editing, logo_url: url })} />
                <div><Label>Website URL</Label><Input value={editing.website_url || ''} onChange={(e) => setEditing({ ...editing, website_url: e.target.value })} /></div>
                <div><Label>Display Order</Label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /><Label>Published</Label></div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Name</TableHead><TableHead>Published</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.display_order}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.is_published ? '✓' : '—'}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default CMSPartners;
