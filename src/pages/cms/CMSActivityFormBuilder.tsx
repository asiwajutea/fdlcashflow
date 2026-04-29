import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/supabase-db';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Eye, Users, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FieldRenderer, FieldDef } from '@/components/forms/FieldRenderer';
import { ALL_CAPABILITIES } from '@/hooks/useCapabilities';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio', label: 'Radio Group' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'file', label: 'File Upload' },
  { value: 'signature', label: 'Signature' },
  { value: 'section', label: 'Section Heading' },
  { value: 'lookup', label: 'Linked Data (Lookup)' },
];

const LOOKUP_SOURCES = ['departments', 'projects', 'teams', 'positions', 'employees'];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one_off', label: 'One-off' },
];

const ASSIGNMENT_TYPES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'user', label: 'Specific User' },
  { value: 'department', label: 'Department' },
  { value: 'team', label: 'Team' },
  { value: 'position', label: 'Position' },
  { value: 'capability', label: 'Capability / Role' },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `field_${Date.now()}`;

const CMSActivityFormBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [newAssignment, setNewAssignment] = useState<any>({ assignment_type: 'everyone' });
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: ff }, { data: aa }, deps, projs, teams, pos, emps] = await Promise.all([
        db.from('activity_forms').select('*').eq('id', id).single(),
        db.from('activity_form_fields').select('*').eq('form_id', id).order('display_order'),
        db.from('activity_form_assignments').select('*').eq('form_id', id),
        db.from('departments').select('id,name').order('name'),
        db.from('projects').select('id,name').order('name'),
        db.from('teams').select('id,name').order('name'),
        db.from('positions').select('id,name').order('name'),
        db.from('profiles').select('id,full_name,email').order('full_name'),
      ]);
      setForm(f);
      setFields(ff || []);
      setAssignments(aa || []);
      setLookups({
        departments: deps.data || [],
        projects: projs.data || [],
        teams: teams.data || [],
        positions: pos.data || [],
        employees: (emps.data || []).map((e: any) => ({ id: e.id, name: e.full_name || e.email })),
      });
    })();
  }, [id]);

  const updateForm = (patch: any) => setForm({ ...form, ...patch });

  const addField = () => {
    const next = [
      ...fields,
      {
        field_key: `field_${fields.length + 1}_${Date.now().toString(36)}`,
        label: 'New Field',
        field_type: 'text',
        is_required: false,
        options: [],
        display_order: fields.length,
        validation: { step: 1 },
      },
    ];
    setFields(next);
    setExpandedField(next.length - 1);
  };

  const updateField = (idx: number, patch: Partial<FieldDef>) => {
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    setFields(next);
  };

  const removeField = (idx: number) => setFields(fields.filter((_, i) => i !== idx));
  const moveField = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    setFields(next);
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.assignment_type) return;
    const payload: any = { form_id: id, assignment_type: newAssignment.assignment_type };
    if (newAssignment.assignment_type === 'capability') payload.capability_key = newAssignment.capability_key;
    else if (newAssignment.assignment_type !== 'everyone') payload.target_id = newAssignment.target_id;
    if (newAssignment.assignment_type !== 'everyone' && !payload.target_id && !payload.capability_key) {
      toast.error('Pick a target');
      return;
    }
    const { data, error } = await db.from('activity_form_assignments').insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setAssignments([...assignments, data]);
    setNewAssignment({ assignment_type: 'everyone' });
  };

  const handleRemoveAssignment = async (aid: string) => {
    const { error } = await db.from('activity_form_assignments').delete().eq('id', aid);
    if (error) { toast.error(error.message); return; }
    setAssignments(assignments.filter((a) => a.id !== aid));
  };

  const handleSave = async () => {
    if (!form?.title?.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    const { error: fErr } = await db.from('activity_forms').update({
      title: form.title,
      description: form.description,
      frequency: form.frequency,
      due_day: form.due_day,
      due_time: form.due_time,
      reminders_enabled: form.reminders_enabled,
      is_active: form.is_active,
      manager_visible: form.manager_visible,
    }).eq('id', id);
    if (fErr) { toast.error(fErr.message); setSaving(false); return; }

    // Replace all fields
    await db.from('activity_form_fields').delete().eq('form_id', id);
    if (fields.length > 0) {
      const payload = fields.map((f, i) => ({
        form_id: id,
        field_key: f.field_key || slugify(f.label),
        label: f.label,
        field_type: f.field_type,
        placeholder: f.placeholder || null,
        help_text: f.help_text || null,
        is_required: !!f.is_required,
        options: f.options || [],
        lookup_source: f.lookup_source || null,
        validation: f.validation || {},
        display_order: i,
      }));
      const { error: fldErr } = await db.from('activity_form_fields').insert(payload);
      if (fldErr) { toast.error(fldErr.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success('Form saved');
  };

  const lookupOptions = useMemo(() => lookups, [lookups]);

  if (!form) {
    return <DashboardLayout title="Form Builder"><p className="text-muted-foreground">Loading…</p></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Form Builder">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/cms/activity-forms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">{form.title || 'Untitled Form'}</h2>
            <p className="text-sm text-muted-foreground">Design fields, set frequency, and choose who must fill it.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setPreviewData({}); setPreviewOpen(true); }}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Form Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Title</Label><Input value={form.title || ''} onChange={(e) => updateForm({ title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description || ''} onChange={(e) => updateForm({ description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => updateForm({ frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.frequency === 'weekly' && (
                  <div>
                    <Label>Due day of week</Label>
                    <Select value={String(form.due_day ?? '')} onValueChange={(v) => updateForm({ due_day: parseInt(v) })}>
                      <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                      <SelectContent>
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) =>
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.frequency === 'monthly' && (
                  <div>
                    <Label>Due day of month</Label>
                    <Input type="number" min={1} max={31} value={form.due_day ?? ''} onChange={(e) => updateForm({ due_day: parseInt(e.target.value) || null })} />
                  </div>
                )}
                <div>
                  <Label>Due time (optional)</Label>
                  <Input type="time" value={form.due_time ?? ''} onChange={(e) => updateForm({ due_time: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => updateForm({ is_active: v })} /><Label>Active (visible to users)</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.reminders_enabled} onCheckedChange={(v) => updateForm({ reminders_enabled: v })} /><Label>Send reminders when overdue</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.manager_visible} onCheckedChange={(v) => updateForm({ manager_visible: v })} /><Label>Visible to managers</Label></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="mt-6 space-y-3">
          {fields.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">No fields yet — click "Add Field" below to start.</CardContent></Card>
          )}
          {fields.map((f, idx) => {
            const isOpen = expandedField === idx;
            const step = (f.validation as any)?.step ?? 1;
            return (
              <Card key={idx} className={isOpen ? 'ring-2 ring-primary/30' : ''}>
                <Collapsible open={isOpen} onOpenChange={(o) => setExpandedField(o ? idx : null)}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 flex-1 text-left hover:opacity-80">
                        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <Badge variant="secondary" className="text-xs">Step {step}</Badge>
                        <span className="font-medium text-foreground truncate">{f.label || 'Untitled'}</span>
                        <Badge>{FIELD_TYPES.find((t) => t.value === f.field_type)?.label}</Badge>
                        {f.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => moveField(idx, -1)}><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveField(idx, 1)}><ChevronDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeField(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><Label>Label</Label><Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} /></div>
                        <div>
                          <Label>Type</Label>
                          <Select value={f.field_type} onValueChange={(v) => updateField(idx, { field_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {!['section', 'yesno', 'checkbox', 'rating', 'signature'].includes(f.field_type) && (
                          <div><Label>Placeholder</Label><Input value={f.placeholder || ''} onChange={(e) => updateField(idx, { placeholder: e.target.value })} /></div>
                        )}
                        <div>
                          <Label>Step (for multi-step forms)</Label>
                          <Input type="number" min={1} value={step} onChange={(e) => updateField(idx, { validation: { ...(f.validation || {}), step: Math.max(1, parseInt(e.target.value) || 1) } })} />
                        </div>
                        <div className="md:col-span-2"><Label>Help text</Label><Input value={f.help_text || ''} onChange={(e) => updateField(idx, { help_text: e.target.value })} /></div>
                        {['select', 'multiselect', 'radio'].includes(f.field_type) && (
                          <div className="md:col-span-2">
                            <Label>Options (one per line OR comma-separated)</Label>
                            <Textarea
                              rows={4}
                              placeholder={'Option 1\nOption 2\nOption 3\n\n— or —\nOption 1, Option 2, Option 3'}
                              value={(f.options || []).map((o: any) => typeof o === 'string' ? o : o.label).join('\n')}
                              onChange={(e) => updateField(idx, { options: e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).map((s) => ({ label: s, value: s })) })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Tip: separate options with new lines or commas. Each entry becomes a selectable choice.</p>
                          </div>
                        )}
                        {f.field_type === 'lookup' && (
                          <div>
                            <Label>Lookup source</Label>
                            <Select value={f.lookup_source || ''} onValueChange={(v) => updateField(idx, { lookup_source: v })}>
                              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                              <SelectContent>
                                {LOOKUP_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {f.field_type !== 'section' && (
                          <div className="flex items-center gap-2 pt-6">
                            <Switch checked={!!f.is_required} onCheckedChange={(v) => updateField(idx, { is_required: v })} />
                            <Label>Required</Label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
          <Button variant="outline" className="w-full" onClick={addField}><Plus className="h-4 w-4 mr-2" /> Add Field</Button>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Who fills this form?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet — nobody can see this form.</p>}
                {assignments.map((a) => {
                  let label = a.assignment_type;
                  if (a.assignment_type === 'capability') label = `Capability: ${a.capability_key}`;
                  else if (a.assignment_type !== 'everyone') {
                    const sourceMap: any = { user: 'employees', department: 'departments', team: 'teams', position: 'positions' };
                    const src = lookups[sourceMap[a.assignment_type]] || [];
                    const found = src.find((x) => x.id === a.target_id);
                    label = `${a.assignment_type}: ${found?.name || a.target_id}`;
                  }
                  return (
                    <Badge key={a.id} variant="secondary" className="gap-2 py-1.5 pr-1">
                      {label}
                      <button onClick={() => handleRemoveAssignment(a.id)} className="hover:bg-destructive/20 rounded p-0.5"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  );
                })}
              </div>
              <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Assignment type</Label>
                  <Select value={newAssignment.assignment_type} onValueChange={(v) => setNewAssignment({ assignment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {newAssignment.assignment_type === 'capability' ? (
                  <div className="md:col-span-2">
                    <Label>Capability</Label>
                    <Select value={newAssignment.capability_key || ''} onValueChange={(v) => setNewAssignment({ ...newAssignment, capability_key: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick capability" /></SelectTrigger>
                      <SelectContent>
                        {ALL_CAPABILITIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : newAssignment.assignment_type !== 'everyone' ? (
                  <div className="md:col-span-2">
                    <Label>Target</Label>
                    <Select value={newAssignment.target_id || ''} onValueChange={(v) => setNewAssignment({ ...newAssignment, target_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick target" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const map: any = { user: 'employees', department: 'departments', team: 'teams', position: 'positions' };
                          return (lookups[map[newAssignment.assignment_type]] || []).map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                ) : <div className="md:col-span-2 text-sm text-muted-foreground">All employees will see this form.</div>}
                <Button onClick={handleAddAssignment} className="md:col-start-3"><Plus className="h-4 w-4 mr-2" /> Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview: {form.title}</DialogTitle></DialogHeader>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          <div className="space-y-4 mt-4">
            {fields.map((f, i) => (
              <FieldRenderer
                key={i}
                field={f}
                value={previewData[f.field_key]}
                onChange={(v) => setPreviewData({ ...previewData, [f.field_key]: v })}
                lookupOptions={lookupOptions}
              />
            ))}
            {fields.length === 0 && <p className="text-sm text-muted-foreground">No fields yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSActivityFormBuilder;
