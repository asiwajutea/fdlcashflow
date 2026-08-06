import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import ContractRenderer from '@/components/ContractRenderer';
import {
  Loader2, Search, FileText, CheckCircle, Sparkles,
  ChevronRight, Users, X, Eye, Code, Check,
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id?: string | null;
}

interface Template {
  id: string;
  title: string;
  role_name: string;
  body_html: string;
}

interface AssignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUserId?: string | null;
  preselectedUserName?: string | null;
  onSaved?: () => void;
}

type Step = 'employee' | 'template' | 'review';

export default function AssignContractDialog({
  open,
  onOpenChange,
  preselectedUserId,
  preselectedUserName,
  onSaved,
}: AssignContractDialogProps) {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [employees,    setEmployees]    = useState<Profile[]>([]);
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [loadingData,  setLoadingData]  = useState(false);

  const [step,         setStep]         = useState<Step>('employee');
  const [search,       setSearch]       = useState('');
  // ── Multi-select employees ────────────────────────────────────────────────
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  // ── Templates + body ─────────────────────────────────────────────────────
  const [selectedTpls,     setSelectedTpls]     = useState<string[]>([]);
  const [templateSearch,   setTemplateSearch]   = useState('');
  const [templateRoleFilter, setTemplateRoleFilter] = useState('all');
  const [bodyHtml,     setBodyHtml]     = useState('');
  const [showRawHtml,  setShowRawHtml]  = useState(false);
  const [saving,       setSaving]       = useState(false);

  // ── Reset + load on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    setSearch('');
    setSelectedTpls([]);
    setBodyHtml('');
    setShowRawHtml(false);
    setTemplateSearch('');
    setTemplateRoleFilter('all');

    if (preselectedUserId && preselectedUserName) {
      setSelectedIds(new Set([preselectedUserId]));
      setStep('template');
    } else {
      setSelectedIds(new Set());
      setStep('employee');
    }

    setLoadingData(true);
    Promise.all([
      db.from('profiles')
        .select('id, full_name, avatar_url, employee_id')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('full_name'),
      db.from('contract_templates')
        .select('id, title, role_name, body_html')
        .eq('is_active', true)
        .order('title'),
    ]).then(([{ data: profiles }, { data: tpls }]) => {
      setEmployees((profiles as Profile[]) || []);
      setTemplates((tpls as Template[]) || []);
      setLoadingData(false);
    });
  }, [open, preselectedUserId, preselectedUserName]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials = (name: string | null) =>
    (name || '?').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  const toggleEmployee = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));

  const clearAll = () => setSelectedIds(new Set());

  const toggleTemplate = (id: string) =>
    setSelectedTpls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const buildBody = () =>
    selectedTpls
      .map((id) => templates.find((t) => t.id === id)?.body_html || '')
      .filter(Boolean)
      .join('\n\n<hr/>\n\n');

  const proceedToReview = () => {
    setBodyHtml(buildBody());
    setStep('review');
  };

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.full_name?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q);
  });

  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id));

  // ── Filtered templates ────────────────────────────────────────────────────
  const uniqueRoles = useMemo(() =>
    [...new Set(templates.map(t => t.role_name).filter(Boolean))].sort(),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (templateRoleFilter !== 'all') {
      list = list.filter(t => t.role_name === templateRoleFilter);
    }
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.role_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, templateRoleFilter, templateSearch]);

  // ── Save: insert one contract per selected employee in parallel ───────────
  const save = async () => {
    if (selectedIds.size === 0 || !user) return;
    if (!bodyHtml.trim()) {
      toast({ title: 'Contract body is empty', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const rows = [...selectedIds].map((uid) => ({
        user_id:     uid,
        template_id: selectedTpls[0] || null,
        body_html:   bodyHtml,
        status:      'pending',
      }));

      const { error: insertError } = await db.from('contracts').insert(rows);
      if (insertError) throw insertError;

      // Notify each employee by SMS + email (non-fatal)
      const tplTitle = templates.find((t) => t.id === selectedTpls[0])?.title || 'Employment Contract';
      await Promise.allSettled(
        [...selectedIds].map(async (uid) => {
          const { data: prof } = await db
            .from('profiles')
            .select('full_name, phone')
            .eq('id', uid)
            .maybeSingle();
          const name = ((prof as any)?.full_name || 'there').split(' ')[0];
          const link = `${window.location.origin}/my-contract`;
          await Promise.allSettled([
            supabase.functions.invoke('send-sms', {
              body: {
                to:           (prof as any)?.phone || '',
                user_id:      uid,
                template_key: 'contract_assigned',
                vars: { name, link },
              },
            }),
            supabase.functions.invoke('send-email', {
              body: {
                template_key: 'contract_assigned',
                user_id: uid,
                name,
                vars: { name, title: tplTitle, origin: window.location.origin },
              },
            }),
          ]);
        }),
      );


      const count = selectedIds.size;
      toast({
        title: `Contract assigned to ${count} employee${count > 1 ? 's' : ''}`,
        description: count > 1 ? 'All recipients have been notified.' : `Sent to ${selectedEmployees[0]?.full_name}`,
      });
      onOpenChange(false);
      onSaved?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Failed to assign contract', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Step breadcrumb ───────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string }[] = [
    { key: 'employee', label: 'Select Employees' },
    { key: 'template', label: 'Choose Template' },
    { key: 'review',   label: 'Review & Send' },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const startStep = preselectedUserId ? 1 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Assign Contract to Employees
          </DialogTitle>
          <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
            {STEPS.slice(startStep).map((s, i) => (
              <span key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span className={
                  s.key === step ? 'text-primary font-semibold'
                  : stepIndex > STEPS.findIndex((x) => x.key === s.key)
                    ? 'text-green-600 font-medium'
                    : 'text-muted-foreground'
                }>
                  {stepIndex > STEPS.findIndex((x) => x.key === s.key) ? `✓ ${s.label}` : s.label}
                </span>
              </span>
            ))}
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* ══ STEP 1: Multi-select employees ══════════════════════════ */}
              {step === 'employee' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select one or more employees. The same contract will be assigned to all of them.
                  </p>

                  {/* Search + select-all row */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-9"
                        placeholder="Search by name or employee ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs"
                      onClick={selectedIds.size === filteredEmployees.length ? clearAll : selectAll}
                    >
                      {selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0
                        ? 'Deselect all'
                        : 'Select all'}
                    </Button>
                  </div>

                  {/* Selection count chip */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/8 rounded-lg border border-primary/20 text-xs">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-primary font-medium">
                        {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''} selected
                      </span>
                      <button onClick={clearAll} className="ml-auto text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active employees found.
                    </p>
                  ) : (
                    <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
                      {filteredEmployees.map((emp) => {
                        const selected = selectedIds.has(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                              selected ? 'bg-primary/5' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => toggleEmployee(emp.id)}
                          >
                            {/* Checkbox indicator */}
                            <div className={`h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                              selected
                                ? 'bg-primary border-primary'
                                : 'border-border bg-background'
                            }`}>
                              {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={emp.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials(emp.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {emp.full_name || 'Unknown'}
                              </p>
                              {emp.employee_id && (
                                <p className="text-xs text-muted-foreground">ID: {emp.employee_id}</p>
                              )}
                            </div>
                            {selected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      disabled={selectedIds.size === 0}
                      onClick={() => setStep('template')}
                    >
                      Continue with {selectedIds.size || ''} employee{selectedIds.size !== 1 ? 's' : ''} →
                    </Button>
                  </div>
                </div>
              )}

              {/* ══ STEP 2: Template picker ══════════════════════════════════ */}
              {step === 'template' && (
                <div className="space-y-4">
                  {/* Selected employees summary */}
                  <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''} selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {selectedEmployees.map((e) => e.full_name).join(', ')}
                      </p>
                    </div>
                    {!preselectedUserId && (
                      <button
                        onClick={() => setStep('employee')}
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Select one or more templates. They will be combined in the order selected.
                  </p>

                  {/* ── Search + role/position filter ── */}
                  {templates.length > 0 && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          className="pl-8 h-8 text-xs"
                          placeholder="Search templates…"
                          value={templateSearch}
                          onChange={e => setTemplateSearch(e.target.value)}
                        />
                      </div>
                      <Select value={templateRoleFilter} onValueChange={setTemplateRoleFilter}>
                        <SelectTrigger className="h-8 text-xs w-44 shrink-0">
                          <SelectValue placeholder="All positions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All positions</SelectItem>
                          {uniqueRoles.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-40" />
                      <p className="text-sm font-medium">No active templates</p>
                      <p className="text-xs">Create templates in Admin → Contract Templates first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No templates match your search.
                          {(templateSearch || templateRoleFilter !== 'all') && (
                            <button
                              className="ml-1.5 text-primary hover:underline text-xs"
                              onClick={() => { setTemplateSearch(''); setTemplateRoleFilter('all'); }}
                            >
                              Clear filters
                            </button>
                          )}
                        </p>
                      ) : filteredTemplates.map((t) => {
                        const sel   = selectedTpls.includes(t.id);
                        const order = selectedTpls.indexOf(t.id) + 1;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTemplate(t.id)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                              sel
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                sel
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-border text-muted-foreground'
                              }`}>
                                {sel ? order : ''}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground">{t.title}</p>
                                {t.role_name && <p className="text-xs text-muted-foreground">{t.role_name}</p>}
                              </div>
                              {sel && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setSelectedTpls([]); setBodyHtml(''); setStep('review'); }}
                    >
                      Write manually
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={templates.length > 0 && selectedTpls.length === 0}
                      onClick={proceedToReview}
                    >
                      {selectedTpls.length > 0
                        ? `Use ${selectedTpls.length} template${selectedTpls.length > 1 ? 's' : ''} →`
                        : templates.length === 0
                        ? 'Continue →'
                        : 'Select at least one'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ══ STEP 3: Review & send ════════════════════════════════════ */}
              {step === 'review' && (
                <div className="space-y-4">
                  {/* Summary row */}
                  <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/40 rounded-lg border text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {selectedIds.size} employee{selectedIds.size > 1 ? 's' : ''}:
                    </span>
                    <span className="text-muted-foreground">
                      {selectedEmployees.map((e) => e.full_name).join(', ')}
                    </span>
                    {selectedTpls.length > 0 && (
                      <span className="flex items-center gap-1 ml-auto text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        {selectedTpls.length} template{selectedTpls.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <button className="text-primary hover:underline" onClick={() => setStep('template')}>
                      Change
                    </button>
                  </div>

                  {/* Preview / edit toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Contract Preview
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        — each employee will read and sign this
                      </span>
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-muted-foreground"
                      onClick={() => setShowRawHtml((v) => !v)}
                    >
                      {showRawHtml
                        ? <><Eye className="h-3.5 w-3.5" /> Preview</>
                        : <><Code className="h-3.5 w-3.5" /> Edit HTML</>}
                    </Button>
                  </div>

                  {showRawHtml ? (
                    <div className="space-y-1">
                      <textarea
                        className="w-full min-h-[260px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        placeholder="HTML contract body…"
                        spellCheck={false}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded">{'{{name}}'}</code>,{' '}
                        <code className="bg-muted px-1 rounded">{'{{position}}'}</code> etc. — filled in per employee when they view it.
                      </p>
                    </div>
                  ) : bodyHtml.trim() ? (
                    <div className="rounded-lg bg-slate-100 p-3">
                      <ContractRenderer bodyHtml={bodyHtml} />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                      No contract content yet.{' '}
                      <button className="text-primary hover:underline" onClick={() => setShowRawHtml(true)}>
                        Click "Edit HTML" to add content.
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {step === 'review' && (
            <Button onClick={save} disabled={saving || !bodyHtml.trim()}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</>
                : <><FileText className="h-4 w-4 mr-1.5" />
                    Assign to {selectedIds.size} Employee{selectedIds.size > 1 ? 's' : ''} & Notify
                  </>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
