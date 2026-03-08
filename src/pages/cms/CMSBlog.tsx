import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from '@/components/cms/ImageUpload';

const emptyPost = { title: '', slug: '', excerpt: '', body: '', status: 'draft', featured_image: '', meta_title: '', meta_description: '', category_id: null };

const CMSBlog = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    const [p, c] = await Promise.all([
      db.from('blog_posts').select('*, blog_categories(name)').order('created_at', { ascending: false }),
      db.from('blog_categories').select('*').order('name'),
    ]);
    setPosts(p.data || []);
    setCategories(c.data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.title || !editing.slug) { toast.error('Title and slug required'); return; }
    const payload = { ...editing };
    delete payload.blog_categories;
    if (payload.status === 'published' && !payload.published_at) payload.published_at = new Date().toISOString();
    if (editing.id) {
      payload.updated_at = new Date().toISOString();
      const { error } = await db.from('blog_posts').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from('blog_posts').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await db.from('blog_posts').delete().eq('id', id);
    toast.success('Deleted'); fetchData();
  };

  return (
    <DashboardLayout title="Manage Blog">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Blog Posts</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ ...emptyPost })}><Plus className="h-4 w-4 mr-2" /> New Post</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} Blog Post</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                  <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={editing.category_id || ''} onValueChange={(v) => setEditing({ ...editing, category_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Excerpt</Label><Textarea value={editing.excerpt || ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></div>
                <div><Label>Body (HTML/Markdown)</Label><Textarea rows={10} value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
                <ImageUpload label="Featured Image" value={editing.featured_image || ''} onChange={(url) => setEditing({ ...editing, featured_image: url })} />
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Meta Title</Label><Input value={editing.meta_title || ''} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} /></div>
                  <div><Label>Meta Description</Label><Input value={editing.meta_description || ''} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} /></div>
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
          <TableBody>
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell className="text-muted-foreground">{p.blog_categories?.name || '—'}</TableCell>
                <TableCell><Badge variant={p.status === 'published' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default CMSBlog;
