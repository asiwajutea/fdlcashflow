import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Pencil, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const empty = { section_key: '', title: '', subtitle: '', body: '', image_url: '' };

const CMSSections = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => { const { data } = await db.from('website_sections').select('*').order('section_key'); setItems(data || []); };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.section_key) { toast.error('Section key required'); return; }
    const payload = { ...editing, updated_at: new Date().toISOString() };
    if (editing.id) {
      const { error } = await db.from('website_sections').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from('website_sections').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  return (
    <DashboardLayout title="Website Sections">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Website Sections</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> Add Section</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Section</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div><Label>Section Key</Label><Input value={editing.section_key} onChange={(e) => setEditing({ ...editing, section_key: e.target.value })} placeholder="e.g. hero, about_intro" /></div>
                <div><Label>Title</Label><Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Subtitle</Label><Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
                <div><Label>Body</Label><Textarea rows={6} value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
                <div><Label>Image URL</Label><Input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Title</TableHead><TableHead>Updated</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.section_key}</TableCell>
                <TableCell className="font-medium">{s.title || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default CMSSections;
