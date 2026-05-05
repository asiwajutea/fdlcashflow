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
import { FieldRenderer, FieldDef, computeSteps } from '@/components/forms/FieldRenderer';
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
  { value: 'page_break', label: '— Page Break (new step) —' },
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

interface FieldEditorProps {
  field: FieldDef;
  idx: number;
  onChange: (patch: Partial<FieldDef>) => void;
  lookupSources: string[];
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field: f, idx, onChange, lookupSources }) => {
  const initial = (f.options || []).map((o: any) => typeof o === 'string' ? o : o.label).join('\n');
  const [optionsText, setOptionsText] = useState(initial);

  // Re-sync if field options change externally (e.g. type switched)
  useEffect(() => {
    const next = (f.options || []).map((o: any) => typeof o === 'string' ? o : o.label).join('\n');
    if (next !== optionsText.replace(/\n+$/, '')) setOptionsText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.field_type]);

  const commitOptions = (raw: string) => {
    const parsed = raw.split('\n').map((s) => s.replace(/\r$/, '').trim()).filter((s) => s.length > 0).map((s) => ({ label: s, value: s }));
    onChange({ options: parsed });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label>Label</Label><Input value={f.label} onChange={(e) => onChange({ label: e.target.value })} /></div>
      <div>
        <Label>Type</Label>
        <Select value={f.field_type} onValueChange={(v) => onChange({ field_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!['section', 'yesno', 'checkbox', 'rating', 'signature'].includes(f.field_type) && (
        <div><Label>Placeholder</Label><Input value={f.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} /></div>
      )}
      <div className="md:col-span-2"><Label>Help text</Label><Input value={f.help_text || ''} onChange={(e) => onChange({ help_text: e.target.value })} /></div>
      {['select', 'multiselect', 'radio', 'checkbox'].includes(f.field_type) && (
        <div className="md:col-span-2">
          <Label>Options (one per line)</Label>
          <Textarea
            rows={5}
            placeholder={'Option 1\nOption 2\nOption 3'}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            onBlur={(e) => commitOptions(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">Press Enter for a new option. Commas, spaces, and other symbols are kept as-is. Options save when you click outside the box.</p>
        </div>
      )}
      {f.field_type === 'lookup' && (
        <div>
          <Label>Lookup source</Label>
          <Select value={f.lookup_source || ''} onValueChange={(v) => onChange({ lookup_source: v })}>
            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              {lookupSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {f.field_type !== 'section' && (
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={!!f.is_required} onCheckedChange={(v) => onChange({ is_required: v })} />
          <Label>Required</Label>
        </div>
      )}
    </div>
  );
};

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
        validation: {},
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
      first_step_name: form.first_step_name || null,
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
      <div className="mb-6 rounded-xl border bg-gradient-to-r from-primary/5 via-card to-card shadow-sm overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-4 p-5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Link to="/cms/activity-forms">
              <Button variant="ghost" size="icon" className="shrink-0 hover:bg-background"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Link to="/cms" className="hover:text-foreground">CMS</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/cms/activity-forms" className="hover:text-foreground">Activity Forms</Link>
                <ChevronRight className="h-3 w-3" />
                <span>Builder</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground truncate">{form.title || 'Untitled Form'}</h2>
              <p className="text-sm text-muted-foreground">Design fields, set frequency, and choose who must fill it.</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={form.is_active ? 'default' : 'secondary'} className="capitalize">{form.is_active ? 'Active' : 'Draft'}</Badge>
                <Badge variant="outline" className="capitalize">{(form.frequency || 'daily').replace('_', ' ')}</Badge>
                <Badge variant="outline">{fields.length} field{fields.length === 1 ? '' : 's'}</Badge>
                <Badge variant="outline">{assignments.length} assignment{assignments.length === 1 ? '' : 's'}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => { setPreviewData({}); setActiveStep(0); setPreviewOpen(true); }}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
            <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
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
              {fields.some((f) => f.field_type === 'page_break') && (
                <div>
                  <Label>Step 1 name (optional)</Label>
                  <Input
                    value={form.first_step_name || ''}
                    onChange={(e) => updateForm({ first_step_name: e.target.value })}
                    placeholder="e.g. Basic Information"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Shown above the first page when this form has multiple steps.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="mt-6 space-y-3">
          {fields.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">No fields yet — click "Add Field" below to start.</CardContent></Card>
          )}
          {(() => {
            // Compute step number for each field based on page_break positions
            let cur = 1;
            const stepByIdx: number[] = fields.map((f) => {
              const s = cur;
              if (f.field_type === 'page_break') cur++;
              return s;
            });
            return fields.map((f, idx) => {
            const isOpen = expandedField === idx;
            const step = stepByIdx[idx];
            const isBreak = f.field_type === 'page_break';
            return (
              <Card key={idx} className={`${isOpen ? 'ring-2 ring-primary/30' : ''} ${isBreak ? 'border-dashed border-primary/40 bg-primary/5' : ''}`}>
                <Collapsible open={isOpen} onOpenChange={(o) => setExpandedField(o ? idx : null)}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 flex-1 text-left hover:opacity-80">
                        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <Badge variant="outline">#{idx + 1}</Badge>
                        {!isBreak && <Badge variant="secondary" className="text-xs">Step {step}</Badge>}
                        <span className="font-medium text-foreground truncate">
                          {isBreak ? `↳ Page Break${(f.validation as any)?.step_name ? ` — Next step: ${(f.validation as any).step_name}` : ''}` : (f.label || 'Untitled')}
                        </span>
                        {!isBreak && <Badge>{FIELD_TYPES.find((t) => t.value === f.field_type)?.label}</Badge>}
                        {!isBreak && f.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
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
                      {isBreak ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Type</Label>
                            <Select value={f.field_type} onValueChange={(v) => updateField(idx, { field_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Next step name (optional)</Label>
                            <Input
                              value={(f.validation as any)?.step_name || ''}
                              onChange={(e) => updateField(idx, { validation: { ...(f.validation || {}), step_name: e.target.value } })}
                              placeholder="e.g. Personal Details"
                            />
                          </div>
                          <p className="md:col-span-2 text-xs text-muted-foreground">All fields after this break will appear on a new page when users fill the form.</p>
                        </div>
                      ) : (
                      <FieldEditor field={f} idx={idx} onChange={(patch) => updateField(idx, patch)} lookupSources={LOOKUP_SOURCES} />
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
            });
          })()}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview: {form.title}</DialogTitle></DialogHeader>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          {(() => {
            const steps = computeSteps(fields, form.first_step_name || '');
            const current = steps[activeStep] || steps[0];
            return (
              <>
                {steps.length > 1 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {steps.map((s, i) => (
                      <button key={i} onClick={() => setActiveStep(i)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${i === activeStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {s.name || `Step ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-4 mt-4">
                  {(current?.fields || []).map((f, i) => (
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
                {steps.length > 1 && (
                  <div className="flex justify-between mt-6 pt-4 border-t">
                    <Button variant="outline" disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)}>Previous</Button>
                    <Button disabled={activeStep >= steps.length - 1} onClick={() => setActiveStep(activeStep + 1)}>Next</Button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSActivityFormBuilder;
