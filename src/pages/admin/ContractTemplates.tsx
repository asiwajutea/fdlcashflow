import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Edit2, Loader2, Upload, Eye,
  Download, CheckCircle, XCircle, LayoutTemplate, Send,
} from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import ContractRenderer from '@/components/ContractRenderer';
import AssignContractDialog from '@/components/hr/AssignContractDialog';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Decode HTML to plain text (strips tags AND decodes entities like &nbsp;) */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  // Use a temporary textarea to decode HTML entities, then strip remaining tags
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

// ─── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  role_name: '',
  position_id: '',
  body_html: '',
  header_html: '',
  footer_html: '',
  pdf_url: '',
  is_active: true,
  margin_top:    56,
  margin_bottom: 56,
  margin_left:   64,
  margin_right:  64,
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

// ─── main component ───────────────────────────────────────────────────────────

export default function ContractTemplates() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // preview dialog
  const [previewItem, setPreviewItem] = useState<any>(null);

  // delete confirm
  const [deleting, setDeleting] = useState<string | null>(null);

  // assign contract to employee
  const [assignOpen, setAssignOpen] = useState(false);

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

  useEffect(() => { load(); }, []);

  if (authLoading) return null;
  if (role && role !== 'admin') return <Navigate to="/dashboard" replace />;

  // ── editor open/close ──────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, header_html: DEFAULT_HEADER, footer_html: DEFAULT_FOOTER });
    setEditorOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title:         item.title         || '',
      role_name:     item.role_name     || '',
      position_id:   item.position_id   || '',
      body_html:     item.body_html     || '',
      header_html:   item.header_html   || '',
      footer_html:   item.footer_html   || '',
      pdf_url:       item.pdf_url       || '',
      is_active:     item.is_active,
      margin_top:    item.margin_top    ?? 56,
      margin_bottom: item.margin_bottom ?? 56,
      margin_left:   item.margin_left   ?? 64,
      margin_right:  item.margin_right  ?? 64,
    });
    setEditorOpen(true);
  };

  // ── PDF upload ─────────────────────────────────────────────────────────────
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
    toast({ title: 'PDF uploaded successfully' });
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      title:         form.title,
      role_name:     form.role_name,
      position_id:   form.position_id || null,
      body_html:     form.body_html,
      header_html:   form.header_html,
      footer_html:   form.footer_html,
      pdf_url:       form.pdf_url,
      is_active:     form.is_active,
      created_by:    user?.id,
      margin_top:    Number(form.margin_top)    || 56,
      margin_bottom: Number(form.margin_bottom) || 56,
      margin_left:   Number(form.margin_left)   || 64,
      margin_right:  Number(form.margin_right)  || 64,
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
    setEditorOpen(false);
    load();
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const remove = async (id: string) => {
    setDeleting(id);
    const { error } = await db.from('contract_templates').delete().eq('id', id);
    setDeleting(null);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template deleted' }); load(); }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Contract Templates">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Contract Templates</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Design reusable contracts with branded header/footer, rich-text body, or an uploaded PDF.
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)} className="shrink-0">
            <Send className="h-4 w-4 mr-1.5" /> Assign to Employee
          </Button>
        </div>

        <Separator />

        {/* ── Template list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No templates yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first template to streamline candidate offer letters.
              </p>
            </div>
            <Button onClick={openNew} variant="outline">
              <Plus className="h-4 w-4 mr-1.5" /> Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((it) => {
              const pos = positions.find((p) => p.id === it.position_id);
              // Decode HTML to clean plain text for the snippet
              const snippet = it.body_html
                ? htmlToPlainText(it.body_html).slice(0, 200)
                : null;

              return (
                <Card key={it.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="mt-0.5 p-2 bg-primary/8 rounded-md shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-base leading-tight">
                            {it.title}
                          </h3>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs gap-1.5"
                              onClick={() => setPreviewItem(it)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs gap-1.5"
                              onClick={() => openEdit(it)}
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => remove(it.id)}
                              disabled={deleting === it.id}
                            >
                              {deleting === it.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge
                            variant={it.is_active ? 'default' : 'secondary'}
                            className="text-xs gap-1 py-0"
                          >
                            {it.is_active
                              ? <><CheckCircle className="h-3 w-3" /> Active</>
                              : <><XCircle className="h-3 w-3" /> Inactive</>}
                          </Badge>
                          {pos && (
                            <Badge variant="outline" className="text-xs py-0">
                              {pos.name}
                            </Badge>
                          )}
                          {it.role_name && (
                            <Badge variant="outline" className="text-xs py-0">
                              {it.role_name}
                            </Badge>
                          )}
                          {it.pdf_url && (
                            <Badge variant="outline" className="text-xs gap-1 py-0">
                              <FileText className="h-3 w-3" /> PDF attached
                            </Badge>
                          )}
                        </div>

                        {/* Body snippet — clean plain text */}
                        {snippet && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {snippet}{snippet.length >= 200 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Editor Dialog ══════════════════════════════════════════════════════ */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[92vh] flex flex-col p-0 gap-0">

          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg">
              {editing ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Meta fields ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Field Officer Employment Contract"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Position <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
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
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Role label <span className="text-xs text-muted-foreground font-normal">(free text, optional)</span></Label>
              <Input
                value={form.role_name}
                onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                placeholder="e.g. Field Officer"
              />
            </div>

            {/* ── Content tabs ── */}
            <Tabs defaultValue="body" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="header">Header</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="footer">Footer</TabsTrigger>
                <TabsTrigger value="page">Page</TabsTrigger>
                <TabsTrigger value="pdf">PDF file</TabsTrigger>
              </TabsList>

              <TabsContent value="header" className="space-y-2 pt-3">
                <p className="text-xs text-muted-foreground">
                  Shown at the top of every page — company logo, document title, confidentiality note.
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
                  Full contract body. Use placeholders like{' '}
                  <code className="bg-muted px-1 rounded">{'{{name}}'}</code>,{' '}
                  <code className="bg-muted px-1 rounded">{'{{position}}'}</code>,{' '}
                  <code className="bg-muted px-1 rounded">{'{{start_date}}'}</code>.
                </p>
                <RichTextEditor
                  minHeight={340}
                  value={form.body_html}
                  onChange={(v) => setForm({ ...form, body_html: v })}
                  placeholder="Type or paste the contract clauses…"
                />
              </TabsContent>

              <TabsContent value="footer" className="space-y-2 pt-3">
                <p className="text-xs text-muted-foreground">
                  Shown at the bottom of every page — copyright, page reference, signature line.
                </p>
                <RichTextEditor
                  compact
                  minHeight={120}
                  value={form.footer_html}
                  onChange={(v) => setForm({ ...form, footer_html: v })}
                  placeholder="Footer text (e.g. © Footprints Dynasty Ltd. Page 1 of 1)"
                />
              </TabsContent>

              <TabsContent value="page" className="space-y-4 pt-3">
                <p className="text-xs text-muted-foreground">
                  Configure the page margins for both the on-screen preview and PDF export.
                  Values are in pixels at 96 dpi (A4 = 794 × 1123 px).
                  Defaults: Top 56 · Bottom 56 · Left 64 · Right 64.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'margin_top',    label: 'Top margin (px)',    min: 0, max: 200 },
                    { key: 'margin_bottom', label: 'Bottom margin (px)', min: 0, max: 200 },
                    { key: 'margin_left',   label: 'Left margin (px)',   min: 0, max: 200 },
                    { key: 'margin_right',  label: 'Right margin (px)',  min: 0, max: 200 },
                  ].map(({ key, label, min, max }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={min}
                          max={max}
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                          className="w-24"
                        />
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                          className="flex-1 accent-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Visual margin diagram */}
                <div className="mt-2 rounded-lg border bg-muted/30 p-4 flex items-center justify-center">
                  <div className="relative bg-white border border-slate-300 shadow-sm"
                    style={{ width: 120, height: 170 }}>
                    {/* Margin indicators */}
                    <div className="absolute inset-0 border-2 border-dashed border-primary/40 pointer-events-none"
                      style={{
                        top:    Math.round(form.margin_top    / 794 * 120),
                        bottom: Math.round(form.margin_bottom / 1123 * 170),
                        left:   Math.round(form.margin_left   / 794 * 120),
                        right:  Math.round(form.margin_right  / 794 * 120),
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] text-muted-foreground text-center leading-tight">
                        T:{form.margin_top} B:{form.margin_bottom}<br/>
                        L:{form.margin_left} R:{form.margin_right}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ ...form, margin_top: 56, margin_bottom: 56, margin_left: 64, margin_right: 64 })}
                  >
                    Reset to defaults
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ ...form, margin_top: 28, margin_bottom: 28, margin_left: 28, margin_right: 28 })}
                  >
                    Narrow (28px)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ ...form, margin_top: 96, margin_bottom: 96, margin_left: 96, margin_right: 96 })}
                  >
                    Wide (96px)
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4 pt-3">
                <p className="text-xs text-muted-foreground">
                  Optionally attach a fully-designed PDF. When present, candidates can view/download it directly
                  instead of the generated version.
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
                    {uploadingPdf
                      ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      : <Upload className="h-4 w-4 mr-1.5" />}
                    {form.pdf_url ? 'Replace PDF' : 'Upload PDF'}
                  </Button>
                  {form.pdf_url && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a href={publicUrl(form.pdf_url)} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1.5" /> View PDF
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setForm({ ...form, pdf_url: '' })}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                      </Button>
                    </>
                  )}
                </div>
                {form.pdf_url && (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md border">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground break-all">
                      {form.pdf_url.split('/').pop()}
                    </span>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* ── Live preview (editor) ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Live Preview</span>
              </div>
              <div className="rounded-lg bg-slate-100 p-4 overflow-x-auto">
                <div className="mx-auto w-fit">
                  <ContractRenderer
                    headerHtml={form.header_html}
                    bodyHtml={form.body_html || '<p style="color:#94a3b8;font-style:italic;">Contract body preview…</p>'}
                    footerHtml={form.footer_html}
                    margins={{ top: Number(form.margin_top), bottom: Number(form.margin_bottom), left: Number(form.margin_left), right: Number(form.margin_right) }}
                  />
                </div>
              </div>
            </div>

            {/* ── Active toggle ── */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <div>
                <p className="text-sm font-medium text-foreground">Active template</p>
                <p className="text-xs text-muted-foreground">
                  Only active templates appear when assigning contracts to candidates.
                </p>
              </div>
            </div>

          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? 'Update Template' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Preview Dialog ═════════════════════════════════════════════════════ */}
      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-full max-h-[94vh] flex flex-col p-0 gap-0">

          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-base font-semibold truncate">{previewItem?.title}</span>
              <div className="flex items-center gap-2 shrink-0">
                {previewItem?.pdf_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={publicUrl(previewItem.pdf_url)} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1.5" /> Open PDF
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setPreviewItem(null); openEdit(previewItem); }}
                >
                  <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Grey "print desk" background — page sits on top */}
          <div
            className="flex-1 overflow-auto bg-slate-200"
            style={{ padding: '24px 16px' }}
          >
            {previewItem && (
              <div className="mx-auto w-fit">
                <ContractRenderer
                  headerHtml={previewItem.header_html}
                  bodyHtml={previewItem.body_html}
                  footerHtml={previewItem.footer_html}
                  margins={{ top: previewItem.margin_top ?? 56, bottom: previewItem.margin_bottom ?? 56, left: previewItem.margin_left ?? 64, right: previewItem.margin_right ?? 64 }}
                />
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* ══ Assign Contract Dialog ════════════════════════════════════════════ */}
      <AssignContractDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

    </DashboardLayout>
  );
}
