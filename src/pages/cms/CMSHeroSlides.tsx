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

const empty = { title: '', accent: '', subtitle: '', image_url: '', display_order: 0, is_published: true };

const CMSHeroSlides = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await db.from('hero_slides').select('*').order('display_order');
    setItems(data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.title) { toast.error('Title required'); return; }
    const payload = { ...editing, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.created_at;
    if (editing.id) {
      const { error } = await db.from('hero_slides').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from('hero_slides').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    await db.from('hero_slides').delete().eq('id', id);
    toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title="Hero Slides">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Hero Slides</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Slide</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Slide</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Accent Text</Label><Input value={editing.accent} onChange={(e) => setEditing({ ...editing, accent: e.target.value })} /></div>
                <div><Label>Subtitle</Label><Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
                <div><Label>Image URL</Label><Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
                {editing.image_url && <img src={editing.image_url} alt="Preview" className="rounded-lg h-32 w-full object-cover" />}
                <div><Label>Display Order</Label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
                  <Label>Published</Label>
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
              <TableHead>Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.image_url && <img src={s.image_url} alt="" className="h-10 w-16 object-cover rounded" />}</TableCell>
                <TableCell className="font-medium">{s.title} <span className="text-brand-red-orange">{s.accent}</span></TableCell>
                <TableCell>{s.display_order}</TableCell>
                <TableCell>{s.is_published ? '✓' : '—'}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default CMSHeroSlides;
