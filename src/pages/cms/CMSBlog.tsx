import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, ArrowLeft, Clock, Sparkles, Tags, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from '@/components/cms/ImageUpload';

const emptyPost = { title: '', slug: '', excerpt: '', body: '', status: 'draft', featured_image: '', meta_title: '', meta_description: '', category_id: null };

function slugifyName(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function nextRunAt(): Date {
  // Cron: 0 8 * * * (UTC) — next 08:00 UTC
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function CountdownCard({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = useMemo(() => nextRunAt(), [Math.floor(now / 60000)]);
  const diff = Math.max(0, target.getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Next auto blog post</p>
            <p className="text-xs text-muted-foreground">
              {target.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · by Ehny
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-2xl font-bold tabular-nums text-primary">
            {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </div>
          <Button onClick={onGenerate} disabled={generating} size="sm" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const CMSBlog = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [inlineCatName, setInlineCatName] = useState('');
  const [showInlineCat, setShowInlineCat] = useState(false);

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

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-blog-generator');
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Blog post generated: ${(data as any)?.post?.title || 'New post'}`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const addInlineCategory = async () => {
    const name = inlineCatName.trim();
    if (!name) return;
    const slug = slugifyName(name);
    const { data, error } = await db.from('blog_categories').insert({ name, slug }).select().single();
    if (error) { toast.error(error.message); return; }
    setCategories(prev => [...prev, data].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setEditing((e: any) => ({ ...e, category_id: data.id }));
    setInlineCatName('');
    setShowInlineCat(false);
    toast.success('Category added');
  };

  const createCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const slug = slugifyName(name);
    const { error } = await db.from('blog_categories').insert({ name, slug });
    if (error) { toast.error(error.message); return; }
    setNewCatName('');
    toast.success('Category added');
    const { data } = await db.from('blog_categories').select('*').order('name');
    setCategories(data || []);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Posts will be uncategorized.')) return;
    const { error } = await db.from('blog_categories').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    const { data } = await db.from('blog_categories').select('*').order('name');
    setCategories(data || []);
    fetchData();
  };

  return (
    <DashboardLayout title="Manage Blog">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Blog Posts</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModalOpen(true)} className="gap-2">
            <Tags className="h-4 w-4" /> Manage categories
          </Button>
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
                      <div className="flex gap-2">
                        <Select value={editing.category_id || ''} onValueChange={(v) => setEditing({ ...editing, category_id: v || null })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowInlineCat(s => !s)} title="Add new category">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {showInlineCat && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="New category name"
                            value={inlineCatName}
                            onChange={(e) => setInlineCatName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInlineCategory(); } }}
                          />
                          <Button type="button" size="sm" onClick={addInlineCategory}>Add</Button>
                        </div>
                      )}
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
      </div>

      <div className="mb-6">
        <CountdownCard onGenerate={handleGenerateNow} generating={generating} />
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
          <TableBody>
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.title}
                  {p.is_auto_generated && <Badge variant="outline" className="ml-2 text-[10px]">AI</Badge>}
                </TableCell>
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

      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
              />
              <Button onClick={createCategory}>Add</Button>
            </div>
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {categories.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No categories yet</p>}
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.slug}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCatModalOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSBlog;
