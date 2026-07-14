import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarChart3, ClipboardList, CheckCircle2, Calendar, Clock, History, TrendingUp, Plus } from 'lucide-react';
import { FieldRenderer, FieldDef, computeSteps } from '@/components/forms/FieldRenderer';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const periodKey = (frequency: string): string => {
  const now = new Date();
  // Anytime: always generate a unique ISO timestamp key so UNIQUE(form_id, user_id, period_key) is never violated
  if (frequency === 'anytime') return now.toISOString();
  if (frequency === 'daily') return now.toISOString().slice(0, 10);
  if (frequency === 'weekly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') return now.toISOString().slice(0, 7);
  return 'once';
};

const ApprovalBadge = ({ status, note }: { status?: string; note?: string }) => {
  if (!status || status === 'not_required') return null;
  if (status === 'pending') return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">Awaiting Approval</Badge>;
  if (status === 'approved') return <Badge className="bg-green-600 hover:bg-green-600 text-white">Approved</Badge>;
  if (status === 'rejected') {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="destructive">Rejected</Badge>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
    );
  }
  return null;
};

const ActivityReport = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<any[]>([]);
  const [fieldsByForm, setFieldsByForm] = useState<Record<string, FieldDef[]>>({});
  const [submissionsByForm, setSubmissionsByForm] = useState<Record<string, any[]>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [activeStep, setActiveStep] = useState(0);

  const loadAll = async () => {
    if (!user) return;
    const { data: fs } = await db.from('activity_forms').select('*').eq('is_active', true).order('frequency');
    const formIds = (fs || []).map((f: any) => f.id);
    if (formIds.length === 0) {
      setForms([]); setFieldsByForm({}); setSubmissionsByForm({}); setHistory([]);
      return;
    }
    const [{ data: ff }, { data: subs }, deps, projs, teams, pos, emps] = await Promise.all([
      db.from('activity_form_fields').select('*').in('form_id', formIds).order('display_order'),
      db.from('activity_form_submissions').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }),
      db.from('departments').select('id,name'),
      db.from('projects').select('id,name'),
      db.from('teams').select('id,name'),
      db.from('positions').select('id,name'),
      db.from('profiles').select('id,full_name,email'),
    ]);
    setForms(fs || []);
    const byForm: Record<string, FieldDef[]> = {};
    (ff || []).forEach((f: any) => { (byForm[f.form_id] ||= []).push(f); });
    setFieldsByForm(byForm);
    const subsBy: Record<string, any[]> = {};
    (subs || []).forEach((s: any) => { (subsBy[s.form_id] ||= []).push(s); });
    setSubmissionsByForm(subsBy);
    setHistory(subs || []);
    setLookups({
      departments: deps.data || [],
      projects: projs.data || [],
      teams: teams.data || [],
      positions: pos.data || [],
      employees: (emps.data || []).map((e: any) => ({ id: e.id, name: e.full_name || e.email })),
    });
  };

  useEffect(() => { loadAll(); }, [user?.id]);

  const openForm = (form: any, forceNew = false) => {
    const pk = periodKey(form.frequency);
    // For anytime forms, always open fresh (unless we're editing an existing specific submission)
    const existing = (form.frequency === 'anytime' && !forceNew)
      ? undefined
      : (submissionsByForm[form.id] || []).find((s: any) => s.period_key === pk);
    setAnswers(existing?.answers || {});
    setActiveStep(0);
    setActive({ ...form, period_key: pk, existing: existing || null });
  };

  const notifyApprover = async (form: any, submissionId: string) => {
    try {
      if (form.approval_type === 'leader') {
        // Notify via notify-staff targeting leaders/managers
        supabase.functions.invoke('notify-staff', {
          body: {
            template_key: 'form_submission_pending',
            roles: ['admin'],
            capabilities: ['manage_activity_forms'],
            vars: {
              submitter: user!.id,
              form: form.title,
              link: `${window.location.origin}/cms/activity-forms/${form.id}/submissions`,
            },
          },
        }).catch(() => {});
      } else if (form.approval_type === 'capability' && form.approval_capability) {
        supabase.functions.invoke('notify-staff', {
          body: {
            template_key: 'form_submission_pending',
            capabilities: [form.approval_capability],
            vars: {
              submitter: user!.id,
              form: form.title,
              link: `${window.location.origin}/cms/activity-forms/${form.id}/submissions`,
            },
          },
        }).catch(() => {});
      } else if (form.approval_type === 'specific_user' && form.approval_user_id) {
        supabase.functions.invoke('send-sms', {
          body: {
            user_id: form.approval_user_id,
            template_key: 'form_submission_pending',
            vars: {
              submitter: user!.id,
              form: form.title,
              link: `${window.location.origin}/cms/activity-forms/${form.id}/submissions`,
            },
          },
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Approval notification failed', e);
    }
  };

  const handleSubmit = async () => {
    if (!active || !user) return;
    const fields = fieldsByForm[active.id] || [];
    for (const f of fields) {
      if (f.is_required && !['section', 'page_break'].includes(f.field_type)) {
        const v = answers[f.field_key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          toast.error(`"${f.label}" is required`);
          return;
        }
      }
    }
    setSubmitting(true);

    const requiresApproval = !!active.requires_approval;
    const approvalStatus = requiresApproval ? 'pending' : 'not_required';

    // For anytime, always insert a fresh row with a unique period_key (timestamp)
    const isAnytime = active.frequency === 'anytime';
    const isUpdate = !isAnytime && !!active.existing;

    let submissionId: string | null = null;
    let error: any;

    if (isUpdate) {
      // Update existing submission for non-anytime forms
      const { error: e } = await db.from('activity_form_submissions').update({
        answers,
        submitted_at: new Date().toISOString(),
        // Reset approval if re-submitted
        approval_status: approvalStatus,
        approver_id: null,
        approver_note: null,
        decided_at: null,
      }).eq('id', active.existing.id);
      error = e;
      submissionId = active.existing.id;
    } else {
      // Insert new submission (always for anytime, first-time for others)
      const { data: inserted, error: e } = await db.from('activity_form_submissions').insert({
        form_id: active.id,
        user_id: user.id,
        period_key: active.period_key,
        answers,
        approval_status: approvalStatus,
      }).select('id').single();
      error = e;
      submissionId = inserted?.id || null;
    }

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Log submission event and notify approver if needed
    if (requiresApproval && submissionId) {
      await db.from('activity_form_submission_events').insert({
        submission_id: submissionId,
        actor_id: user.id,
        event_type: 'submitted',
        note: '',
      }).then(() => {});

      await notifyApprover(active, submissionId);
      toast.success('Submitted — awaiting approval');
    } else {
      toast.success(isUpdate ? 'Updated' : 'Submitted');
    }

    setSubmitting(false);
    setActive(null);
    loadAll();
  };

  const dueForms = useMemo(() => forms.filter((f) => {
    // Anytime forms are always "due" — users can always submit
    if (f.frequency === 'anytime') return true;
    const pk = periodKey(f.frequency);
    return !(submissionsByForm[f.id] || []).some((s: any) => s.period_key === pk);
  }), [forms, submissionsByForm]);

  const completedNow = useMemo(() => forms.filter((f) => {
    if (f.frequency === 'anytime') return false; // anytime never "completed"
    const pk = periodKey(f.frequency);
    return (submissionsByForm[f.id] || []).some((s: any) => s.period_key === pk);
  }).length, [forms, submissionsByForm]);

  return (
    <DashboardLayout title="Activity Report">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Activity Report</h2>
        <p className="text-muted-foreground">Complete your assigned forms and review your submission history.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6 flex items-center gap-3"><ClipboardList className="h-8 w-8 text-primary" /><div><div className="text-2xl font-bold">{forms.length}</div><div className="text-sm text-muted-foreground">Assigned forms</div></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><Clock className="h-8 w-8 text-orange-500" /><div><div className="text-2xl font-bold">{dueForms.length}</div><div className="text-sm text-muted-foreground">Due now</div></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-600" /><div><div className="text-2xl font-bold">{completedNow}</div><div className="text-sm text-muted-foreground">Completed this period</div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="due">
        <TabsList>
          <TabsTrigger value="due">Due ({dueForms.length})</TabsTrigger>
          <TabsTrigger value="all">All Assigned</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="mt-4 space-y-3">
          {dueForms.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">🎉 You're all caught up!</CardContent></Card>
          ) : dueForms.map((f) => (
            <FormCard key={f.id} form={f} onClick={() => openForm(f, true)} />
          ))}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {forms.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No forms have been assigned to you yet.</CardContent></Card>
          ) : forms.map((f) => {
            const isAnytime = f.frequency === 'anytime';
            const pk = periodKey(f.frequency);
            const done = !isAnytime && (submissionsByForm[f.id] || []).some((s: any) => s.period_key === pk);
            const latestSub = isAnytime ? (submissionsByForm[f.id] || [])[0] : null;
            return (
              <FormCard
                key={f.id}
                form={f}
                done={done}
                latestApprovalStatus={isAnytime ? latestSub?.approval_status : undefined}
                onClick={() => openForm(f, isAnytime)}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {history.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No submissions yet.</CardContent></Card>
          ) : history.map((s) => {
            const f = forms.find((x) => x.id === s.form_id);
            return (
              <Card key={s.id} className="cursor-pointer hover:bg-accent/30" onClick={() => f && openForm(f)}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{f?.title || 'Form'}</div>
                      <div className="text-xs text-muted-foreground">Period {s.period_key}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ApprovalBadge status={s.approval_status} note={s.approver_note} />
                    <div className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          {active?.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <Calendar className="h-3 w-3" />
            {active?.frequency === 'anytime'
              ? <span>Anytime — new submission</span>
              : <span>Period: {active?.period_key}</span>
            }
            {active?.existing && active?.frequency !== 'anytime' && (
              <Badge variant="secondary" className="ml-2">Already submitted — editing</Badge>
            )}
          </div>

          {/* Current approval status for existing non-anytime submissions */}
          {active?.existing && active?.frequency !== 'anytime' && (
            <div className="mt-1">
              <ApprovalBadge status={active.existing.approval_status} note={active.existing.approver_note} />
            </div>
          )}

          {(() => {
            const allFields = fieldsByForm[active?.id] || [];
            const steps = computeSteps(allFields, (active as any)?.first_step_name || '');
            const current = steps[activeStep] || steps[0];
            const stepFields = current?.fields || [];
            const isLast = activeStep >= steps.length - 1;
            return (
              <>
                {steps.length > 1 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {steps.map((s, i) => (
                      <div key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${i === activeStep ? 'bg-primary text-primary-foreground' : i < activeStep ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {s.name || `Step ${i + 1}`}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-4 mt-4">
                  {stepFields.map((f: any, i: number) => (
                    <FieldRenderer
                      key={i}
                      field={f}
                      value={answers[f.field_key]}
                      onChange={(v) => setAnswers({ ...answers, [f.field_key]: v })}
                      lookupOptions={lookups}
                    />
                  ))}
                </div>
                <div className="flex justify-between gap-2 mt-6 pt-4 border-t">
                  <div>
                    {steps.length > 1 && activeStep > 0 && (
                      <Button variant="outline" onClick={() => setActiveStep(activeStep - 1)}>Previous</Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
                    {steps.length > 1 && !isLast ? (
                      <Button onClick={() => setActiveStep(activeStep + 1)}>Next</Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Submitting…' : (
                          active?.frequency === 'anytime' ? 'Submit' :
                          active?.existing ? 'Update' : 'Submit'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const FormCard = ({
  form,
  done,
  latestApprovalStatus,
  onClick,
}: {
  form: any;
  done?: boolean;
  latestApprovalStatus?: string;
  onClick: () => void;
}) => {
  const isAnytime = form.frequency === 'anytime';
  const showAnalytics = form.analytics_visible_to_submitter !== false || form.analytics_employee_visible;
  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 cursor-pointer" onClick={onClick}>
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              {form.title}
              {done && <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>}
              {isAnytime && latestApprovalStatus && latestApprovalStatus !== 'not_required' && (
                <Badge className={
                  latestApprovalStatus === 'pending' ? 'bg-yellow-500 hover:bg-yellow-500 text-white' :
                  latestApprovalStatus === 'approved' ? 'bg-green-600 hover:bg-green-600 text-white' :
                  'bg-destructive'
                }>
                  {latestApprovalStatus === 'pending' ? 'Awaiting Approval' :
                   latestApprovalStatus === 'approved' ? 'Last: Approved' : 'Last: Rejected'}
                </Badge>
              )}
            </CardTitle>
            {form.description && <CardDescription>{form.description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {showAnalytics && (
              <Link to={`/activity-report/${form.id}/analytics`} onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm"><TrendingUp className="h-3 w-3 mr-1" /> Analytics</Button>
              </Link>
            )}
            {isAnytime && (
              <Button size="sm" onClick={onClick}>
                <Plus className="h-3 w-3 mr-1" /> Submit again
              </Button>
            )}
            <Badge variant="outline" className="capitalize">{form.frequency.replace('_', ' ')}</Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default ActivityReport;
