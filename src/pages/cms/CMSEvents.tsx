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
import ImageUpload from '@/components/cms/ImageUpload';

const empty = { title: '', slug: '', short_description: '', description: '', display_order: 0, is_published: true, event_date: '', registration_url: '', image_url: '' };

const CMSEvents = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await db.from('events').select('*').order('display_order');
    setItems(data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.title || !editing.slug) { toast.error('Title and slug required'); return; }
    const payload = { ...editing };
    if (editing.id) {
      const { error } = await db.from('events').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from('events').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved');
    setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await db.from('events').delete().eq('id', id);
    toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title="Manage Events">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Events</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Event</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Event</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                <div><Label>Event Date</Label><Input type="date" value={editing.event_date || ''} onChange={(e) => setEditing({ ...editing, event_date: e.target.value })} /></div>
                <ImageUpload value={editing.image_url || ''} onChange={(url) => setEditing({ ...editing, image_url: url })} />
                <div><Label>Short Description</Label><Textarea value={editing.short_description || ''} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} /></div>
                <div><Label>Full Description</Label><Textarea rows={6} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div><Label>Registration URL</Label><Input value={editing.registration_url || ''} onChange={(e) => setEditing({ ...editing, registration_url: e.target.value })} /></div>
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
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Published</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.display_order}</TableCell>
                <TableCell>{s.image_url ? <img src={s.image_url} alt={s.title} className="h-10 w-16 object-cover rounded" /> : <span className="text-muted-foreground text-xs">No image</span>}</TableCell>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell className="text-muted-foreground">{s.event_date || '—'}</TableCell>
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

export default CMSEvents;
