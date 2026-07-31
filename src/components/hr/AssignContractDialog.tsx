import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import ContractRenderer from '@/components/ContractRenderer';
import {
  Loader2, Search, FileText, CheckCircle, Sparkles,
  ChevronRight, User, X, Eye, Code,
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  position?: string | null;
  department?: string | null;
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
  /** Pre-select a specific employee (skips the employee-picker step) */
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
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [employees, setEmployees]     = useState<Profile[]>([]);
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState<Step>('employee');
  const [search, setSearch]               = useState('');
  const [selectedUser, setSelectedUser]   = useState<Profile | null>(null);
  const [selectedTpls, setSelectedTpls]   = useState<string[]>([]);
  const [bodyHtml, setBodyHtml]           = useState('');
  const [showRawHtml, setShowRawHtml]     = useState(false);
  const [saving, setSaving]               = useState(false);

  // Load existing contracts count for this user (for information only)
  const [existingCount, setExistingCount] = useState(0);

  // ── Load data on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Reset state
    setSearch('');
    setSelectedTpls([]);
    setBodyHtml('');
    setShowRawHtml(false);
    setExistingCount(0);

    if (preselectedUserId && preselectedUserName) {
      setSelectedUser({ id: preselectedUserId, full_name: preselectedUserName, avatar_url: null });
      setStep('template');
    } else {
      setSelectedUser(null);
      setStep('employee');
    }

    const fetchData = async () => {
      setLoadingData(true);
      const [{ data: profiles }, { data: tpls }] = await Promise.all([
        db
          .from('profiles')
          .select('id, full_name, avatar_url, employee_id, position_id, department_id')
          .eq('approval_status', 'approved')
          .eq('is_active', true)
          .order('full_name'),
        db
          .from('contract_templates')
          .select('id, title, role_name, body_html')
          .eq('is_active', true)
          .order('title'),
      ]);
      setEmployees((profiles as Profile[]) || []);
      setTemplates((tpls as Template[]) || []);
      setLoadingData(false);
    };
    fetchData();
  }, [open, preselectedUserId, preselectedUserName]);

  // Load existing contracts count when a user is selected
  useEffect(() => {
    if (!selectedUser) return;
    db
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', selectedUser.id)
      .then(({ count }) => setExistingCount(count ?? 0));
  }, [selectedUser]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials = (name: string | null) =>
    (name || '?')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

  const toggleTemplate = (id: string) =>
    setSelectedTpls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const buildBody = () => {
    if (selectedTpls.length === 0) return '';
    return selectedTpls
      .map((id) => templates.find((t) => t.id === id)?.body_html || '')
      .filter(Boolean)
      .join('\n\n<hr/>\n\n');
  };

  const proceedToReview = () => {
    setBodyHtml(buildBody());
    setStep('review');
  };

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.full_name?.toLowerCase().includes(q) ||
      e.employee_id?.toLowerCase().includes(q)
    );
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!selectedUser || !user) return;
    if (!bodyHtml.trim()) {
      toast({ title: 'Contract body is empty', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id:     selectedUser.id,
        template_id: selectedTpls[0] || null,
        body_html:   bodyHtml,
        status:      'pending',
      };

      // Always insert a new contract — employees can have multiple
      const { error: insertError } = await db.from('contracts').insert(payload);
      if (insertError) throw insertError;

      // Notify the employee via inbox
      try {
        const { data: prof } = await db
          .from('profiles')
          .select('full_name, phone')
          .eq('id', selectedUser.id)
          .maybeSingle();
        const name = (prof?.full_name || 'there').split(' ')[0];
        await supabase.functions.invoke('send-sms', {
          body: {
            to:           prof?.phone || '',
            user_id:      selectedUser.id,
            template_key: 'candidate_offer',
            vars: {
              name,
              position: 'your role',
              link:     `${window.location.origin}/my-contract`,
            },
          },
        });
      } catch (e) {
        // Non-fatal — notification failure doesn't block the save
        console.warn('Contract notification failed:', e);
      }

      toast({ title: 'Contract assigned', description: `Sent to ${selectedUser.full_name}` });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Failed to assign contract', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Step labels ───────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string }[] = [
    { key: 'employee', label: 'Select Employee' },
    { key: 'template', label: 'Choose Template' },
    { key: 'review',   label: 'Review & Send' },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const startStep = preselectedUserId ? 1 : 0; // skip employee step if pre-selected

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Assign Contract to Employee
          </DialogTitle>

          {/* Step breadcrumb */}
          <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
            {STEPS.slice(startStep).map((s, i) => (
              <span key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span className={
                  s.key === step
                    ? 'text-primary font-semibold'
                    : stepIndex > STEPS.findIndex((x) => x.key === s.key)
                    ? 'text-green-600 font-medium'
                    : 'text-muted-foreground'
                }>
                  {s.key === step
                    ? s.label
                    : stepIndex > STEPS.findIndex((x) => x.key === s.key)
                    ? `✓ ${s.label}`
                    : s.label}
                </span>
              </span>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* ── STEP 1: Employee picker ─────────────────────────────── */}
              {step === 'employee' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select the employee you want to assign a contract to.
                  </p>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name or employee ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active employees found.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto rounded-lg border divide-y">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                          onClick={() => {
                            setSelectedUser(emp);
                            setStep('template');
                          }}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={emp.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {initials(emp.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {emp.full_name || 'Unknown'}
                            </p>
                            {emp.employee_id && (
                              <p className="text-xs text-muted-foreground">
                                ID: {emp.employee_id}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Template picker ─────────────────────────────── */}
              {step === 'template' && (
                <div className="space-y-4">
                  {/* Selected employee chip */}
                  {selectedUser && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1 truncate">
                        {selectedUser.full_name}
                      </span>
                      {!preselectedUserId && (
                        <button
                          onClick={() => { setSelectedUser(null); setStep('employee'); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Existing contracts notice */}
                  {existingCount > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400">
                      This employee already has <strong>{existingCount}</strong> contract{existingCount > 1 ? 's' : ''} assigned.
                      This will add a new one — they will need to sign all of them.
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Select one or more templates. They will be combined in the order selected.
                  </p>

                  {templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-40" />
                      <p className="text-sm font-medium">No active templates</p>
                      <p className="text-xs">
                        Create templates in Admin → Contract Templates first, or continue to write manually.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((t) => {
                        const sel   = selectedTpls.includes(t.id);
                        const order = selectedTpls.indexOf(t.id) + 1;
                        return (
                          <button
                            key={t.id}
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
                                {t.role_name && (
                                  <p className="text-xs text-muted-foreground">{t.role_name}</p>
                                )}
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
                      onClick={() => {
                        setSelectedTpls([]);
                        setBodyHtml('');
                        setStep('review');
                      }}
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

              {/* ── STEP 3: Review & send ──────────────────────────────── */}
              {step === 'review' && (
                <div className="space-y-4">
                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="gap-1.5">
                      <User className="h-3 w-3" />
                      {selectedUser?.full_name}
                    </Badge>
                    {selectedTpls.length > 0 && (
                      <Badge variant="outline" className="gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        {selectedTpls.length} template{selectedTpls.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setStep('template')}
                    >
                      Change
                    </button>
                  </div>

                  {/* Label row with preview/edit toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Contract Preview
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        — the employee will read and sign this
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
                    /* Raw HTML editor for advanced tweaks */
                    <div className="space-y-1">
                      <textarea
                        className="w-full min-h-[260px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        placeholder="HTML contract body…"
                        spellCheck={false}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use placeholders like{' '}
                        <code className="bg-muted px-1 rounded">{'{{name}}'}</code>,{' '}
                        <code className="bg-muted px-1 rounded">{'{{position}}'}</code> if needed.
                      </p>
                    </div>
                  ) : (
                    /* Rendered contract preview */
                    bodyHtml.trim() ? (
                      <div className="rounded-lg bg-slate-100 p-3">
                        <ContractRenderer bodyHtml={bodyHtml} />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                        No contract content yet.{' '}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => setShowRawHtml(true)}
                        >
                          Click "Edit HTML" to add content.
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {step === 'review' && (
            <Button onClick={save} disabled={saving || !bodyHtml.trim()}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</>
                : <><FileText className="h-4 w-4 mr-1.5" /> Assign & Notify</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
