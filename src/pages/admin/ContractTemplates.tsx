import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Edit, Loader2, Upload, Eye, Download } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import ContractRenderer from '@/components/ContractRenderer';

const empty = {
  title: '',
  role_name: '',
  position_id: '',
  body_html: '',
  header_html: '',
  footer_html: '',
  pdf_url: '',
  is_active: true,
};

const DEFAULT_HEADER = `<div style="display:flex;align-items:center;justify-content:space-between;">
  <div style="font-weight:700;font-size:18px;color:#0B1F3B;">Footprints Dynasty Ltd</div>
  <div style="font-size:11px;color:#64748b;text-align:right;">
    Employment Contract<br/>Confidential Document
  </div>
</div>`;
const DEFAULT_FOOTER = `<div style="display:flex;align-items:center;justify-content:space-between;">
  <div>© Footprints Dynasty Ltd. All rights reserved.</div>
  <div>Page 1 of 1</div>
</div>`;

const publicUrl = (path: string) =>
  path?.startsWith('http')
    ? path
    : path
    ? `https://uppixbfndhlyfeyjoxrg.supabase.co/storage/v1/object/public/documents/${path}`
    : '';

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
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    load();
  }, []);

  if (authLoading) return null;
  if (role && role !== 'admin') return <Navigate to="/dashboard" replace />;

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, header_html: DEFAULT_HEADER, footer_html: DEFAULT_FOOTER });
    setOpen(true);
  };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      role_name: item.role_name || '',
      position_id: item.position_id || '',
      body_html: item.body_html || '',
      header_html: item.header_html || '',
      footer_html: item.footer_html || '',
      pdf_url: item.pdf_url || '',
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const uploadPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'PDF only', description: 'Please choose a .pdf file', variant: 'destructive' });
      return;
    }
    setUploadingPdf(true);
    const path = `contract-templates/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    setUploadingPdf(false);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    setForm((f: any) => ({ ...f, pdf_url: path }));
    toast({ title: 'PDF uploaded' });
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title,
      role_name: form.role_name,
      position_id: form.position_id || null,
      body_html: form.body_html,
      header_html: form.header_html,
      footer_html: form.footer_html,
      pdf_url: form.pdf_url,
      is_active: form.is_active,
      created_by: user?.id,
    };
    const { error } = editing
      ? await db.from('contract_templates').update(payload).eq('id', editing.id)
      : await db.from('contract_templates').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Contract Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Design reusable contracts with branded header/footer, rich-text body, or an uploaded PDF.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No templates yet. Create one to streamline candidate offers.
            </CardContent>
          </Card>
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
                        {pos && (
                          <Badge variant="outline" className="text-xs">
                            {pos.name}
                          </Badge>
                        )}
                        {it.role_name && (
                          <Badge variant="outline" className="text-xs">
                            {it.role_name}
                          </Badge>
                        )}
                        {it.pdf_url && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" /> PDF attached
                          </Badge>
                        )}
                        <Badge variant={it.is_active ? 'default' : 'secondary'} className="text-xs">
                          {it.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setPreviewItem(it)} title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(it)} title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: it.body_html || '<em>No body content.</em>',
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Editor dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit template' : 'New template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Field Officer Employment Contract"
                  />
                </div>
                <div>
                  <Label>Position</Label>
                  <Select
                    value={form.position_id || 'none'}
                    onValueChange={(v) => setForm({ ...form, position_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any position</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Role label (free text)</Label>
                <Input
                  value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  placeholder="e.g. Field Officer"
                />
              </div>

              <Tabs defaultValue="body" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="header">Header</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="footer">Footer</TabsTrigger>
                  <TabsTrigger value="pdf">PDF file</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="space-y-2 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Shown at the top of every rendered contract. Use it for the company logo, title and confidentiality
                    note.
                  </p>
                  <RichTextEditor
                    compact
                    minHeight={140}
                    value={form.header_html}
                    onChange={(v) => setForm({ ...form, header_html: v })}
                    placeholder="Header design (company name, logo HTML, etc.)"
                  />
                </TabsContent>

                <TabsContent value="body" className="space-y-2 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Rich-text contract body. Use placeholders like <code>{'{{name}}'}</code>, <code>{'{{position}}'}</code>,{' '}
                    <code>{'{{start_date}}'}</code>.
                  </p>
                  <RichTextEditor
                    minHeight={320}
                    value={form.body_html}
                    onChange={(v) => setForm({ ...form, body_html: v })}
                    placeholder="Type or paste the contract clauses…"
                  />
                </TabsContent>

                <TabsContent value="footer" className="space-y-2 pt-3">
                  <p className="text-xs text-muted-foreground">Shown at the bottom of every rendered contract.</p>
                  <RichTextEditor
                    compact
                    minHeight={120}
                    value={form.footer_html}
                    onChange={(v) => setForm({ ...form, footer_html: v })}
                    placeholder="Footer text (copyright, page reference, etc.)"
                  />
                </TabsContent>

                <TabsContent value="pdf" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Optionally attach a fully-designed PDF. When present, candidates can view/download it directly.
                  </p>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPdf(f);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={uploadingPdf}
                    >
                      {uploadingPdf ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      {form.pdf_url ? 'Replace PDF' : 'Upload PDF'}
                    </Button>
                    {form.pdf_url && (
                      <>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={publicUrl(form.pdf_url)} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" /> View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm({ ...form, pdf_url: '' })}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </>
                    )}
                  </div>
                  {form.pdf_url && (
                    <div className="text-xs text-muted-foreground break-all">
                      {form.pdf_url.split('/').pop()}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="border rounded-md p-3 bg-muted/30">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Live preview</div>
                <div className="max-h-[420px] overflow-auto">
                  <ContractRenderer
                    headerHtml={form.header_html}
                    bodyHtml={form.body_html || '<em>Contract body preview…</em>'}
                    footerHtml={form.footer_html}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <span>Active (available when assigning to candidates)</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewItem?.title}
                {previewItem?.pdf_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={publicUrl(previewItem.pdf_url)} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" /> Open PDF
                    </a>
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {previewItem && (
              <ContractRenderer
                headerHtml={previewItem.header_html}
                bodyHtml={previewItem.body_html}
                footerHtml={previewItem.footer_html}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
