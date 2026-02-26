import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const empty = { title: '', media_url: '', media_type: 'image', category: '', display_order: 0, is_published: true };

const CMSGallery = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await db.from('gallery_items').select('*').order('display_order');
    setItems(data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.media_url) { toast.error('Media URL required'); return; }
    if (editing.id) {
      const { error } = await db.from('gallery_items').update(editing).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from('gallery_items').insert(editing);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await db.from('gallery_items').delete().eq('id', id);
    toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title="Manage Gallery">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Gallery</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Gallery Item</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Media URL</Label><Input value={editing.media_url} onChange={(e) => setEditing({ ...editing, media_url: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Events, Team, Office" /></div>
                <div><Label>Type</Label><Input value={editing.media_type || 'image'} onChange={(e) => setEditing({ ...editing, media_type: e.target.value })} /></div>
                <div><Label>Display Order</Label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /><Label>Published</Label></div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative group bg-card rounded-lg border overflow-hidden">
            <img src={item.media_url} alt={item.title || ''} className="w-full h-40 object-cover" />
            <div className="p-2">
              <p className="text-sm font-medium truncate">{item.title || 'Untitled'}</p>
              <p className="text-xs text-muted-foreground">{item.category || 'No category'}</p>
            </div>
            <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7" onClick={() => handleDelete(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CMSGallery;
