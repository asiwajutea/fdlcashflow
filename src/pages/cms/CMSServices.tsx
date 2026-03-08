import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const emptyService = { title: '', slug: '', short_description: '', description: '', icon: '', image_url: '', display_order: 0, is_published: true, cta_type: 'quote' };

const CMSServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await db.from('services').select('*').order('display_order');
    setServices(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.title || !editing.slug) { toast.error('Title and slug are required'); return; }
    if (editing.id) {
      const { error } = await db.from('services').update(editing).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Service updated');
    } else {
      const { error } = await db.from('services').insert(editing);
      if (error) { toast.error(error.message); return; }
      toast.success('Service created');
    }
    setOpen(false);
    setEditing(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await db.from('services').delete().eq('id', id);
    toast.success('Deleted');
    fetchData();
  };

  return (
    <DashboardLayout title="Manage Services">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Services</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ ...emptyService })}><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Service</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                <div><Label>Icon (Lucide name)</Label><Input value={editing.icon || ''} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></div>
                <div>
                  <Label>Image URL</Label>
                  <Input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
                  {editing.image_url && (
                    <img src={editing.image_url} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-md border" />
                  )}
                </div>
                <div><Label>Short Description</Label><Textarea value={editing.short_description || ''} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} /></div>
                <div><Label>Full Description</Label><Textarea rows={6} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div><Label>Display Order</Label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>CTA Type</Label><Input value={editing.cta_type || ''} onChange={(e) => setEditing({ ...editing, cta_type: e.target.value })} placeholder="quote / demo" /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /><Label>Published</Label></div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Order</TableHead><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Published</TableHead><TableHead className="w-20"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.display_order}</TableCell>
                <TableCell>{s.image_url ? <img src={s.image_url} alt={s.title} className="h-10 w-16 object-cover rounded" /> : <span className="text-muted-foreground text-xs">No image</span>}</TableCell>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell className="text-muted-foreground">{s.slug}</TableCell>
                <TableCell>{s.is_published ? '✓' : '—'}</TableCell>
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

export default CMSServices;
