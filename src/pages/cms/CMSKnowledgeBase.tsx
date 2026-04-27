import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, ArrowLeft, Search, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CMSKnowledgeBase = () => {
  const { user } = useAuth();
  const empty: any = {
    title: '', slug: '', summary: '', body: '', category_id: null, department_id: null,
    tags: [], status: 'draft', is_pinned: false, cover_image: '', attachments: []
  };
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    const [arts, cats, depts] = await Promise.all([
      (db as any).from('kb_articles').select('*').order('updated_at', { ascending: false }),
      (db as any).from('kb_categories').select('id, name').eq('is_active', true).order('display_order'),
      (db as any).from('departments').select('id, name').eq('is_active', true).order('display_order'),
    ]);
    setItems(arts.data || []);
    setCategories(cats.data || []);
    setDepartments(depts.data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!editing.title?.trim()) { toast.error('Title required'); return; }
    const tags = typeof editing.tags === 'string'
      ? editing.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : (Array.isArray(editing.tags) ? editing.tags : []);
    const payload: any = {
      title: editing.title.trim(),
      slug: editing.slug?.trim() || slugify(editing.title),
      summary: editing.summary || '',
      body: editing.body || '',
      category_id: editing.category_id || null,
      department_id: editing.department_id || null,
      tags,
      status: editing.status,
      is_pinned: !!editing.is_pinned,
      cover_image: editing.cover_image || '',
      attachments: editing.attachments || [],
    };
    if (payload.status === 'published' && !editing.published_at) {
      payload.published_at = new Date().toISOString();
    }
    if (editing.id) {
      const { error } = await (db as any).from('kb_articles').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      payload.created_by = user?.id;
      const { error } = await (db as any).from('kb_articles').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Saved'); setOpen(false); setEditing(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    const { error } = await (db as any).from('kb_articles').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchData();
  };

  const filtered = items.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q);
  });

  return (
    <DashboardLayout title="Knowledge Base CMS">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Knowledge Base Articles</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cms/kb-categories"><Button variant="outline" size="sm">Manage Categories</Button></Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-2" /> New Article</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} Article</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Label>Title *</Label>
                      <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Slug</Label>
                      <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} placeholder="auto-generated" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={editing.category_id || ''} onValueChange={(v) => setEditing({ ...editing, category_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Department <span className="text-xs text-muted-foreground">(scope to one, or leave blank for everyone)</span></Label>
                      <Select value={editing.department_id || 'all'} onValueChange={(v) => setEditing({ ...editing, department_id: v === 'all' ? null : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Summary</Label>
                      <Input value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} placeholder="Brief one-line description" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Cover Image URL</Label>
                      <Input value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
                      <Input
                        value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags}
                        onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                        placeholder="onboarding, leave, payroll"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Body <span className="text-xs text-muted-foreground">(supports basic markdown: # heading, **bold**, *italic*, [link](url), - list)</span></Label>
                    <Tabs defaultValue="write" className="mt-1">
                      <TabsList>
                        <TabsTrigger value="write">Write</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      <TabsContent value="write">
                        <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={12} className="font-mono text-sm" />
                      </TabsContent>
                      <TabsContent value="preview">
                        <div className="border rounded-md p-4 bg-muted/30 min-h-[200px] whitespace-pre-wrap text-sm">{editing.body || <span className="text-muted-foreground">Nothing to preview</span>}</div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={editing.is_pinned} onCheckedChange={(v) => setEditing({ ...editing, is_pinned: v })} />
                      <Label>Pin to top</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Status</Label>
                      <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full">Save Article</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No articles</TableCell></TableRow>}
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {a.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                  {a.title}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{categories.find(c => c.id === a.category_id)?.name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{departments.find(d => d.id === a.department_id)?.name || 'All'}</TableCell>
                <TableCell><Badge variant={a.status === 'published' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.view_count}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...a }); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

export default CMSKnowledgeBase;
