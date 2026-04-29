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
import { BarChart3, ClipboardList, CheckCircle2, Calendar, Clock, History } from 'lucide-react';
import { FieldRenderer, FieldDef } from '@/components/forms/FieldRenderer';

const periodKey = (frequency: string): string => {
  const now = new Date();
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

  const openForm = (form: any) => {
    const pk = periodKey(form.frequency);
    const existing = (submissionsByForm[form.id] || []).find((s: any) => s.period_key === pk);
    setAnswers(existing?.answers || {});
    setActive({ ...form, period_key: pk, existing });
  };

  const handleSubmit = async () => {
    if (!active || !user) return;
    const fields = fieldsByForm[active.id] || [];
    for (const f of fields) {
      if (f.is_required && f.field_type !== 'section') {
        const v = answers[f.field_key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          toast.error(`"${f.label}" is required`);
          return;
        }
      }
    }
    setSubmitting(true);
    const payload = {
      form_id: active.id,
      user_id: user.id,
      period_key: active.period_key,
      answers,
    };
    let error;
    if (active.existing) {
      ({ error } = await db.from('activity_form_submissions').update({ answers, submitted_at: new Date().toISOString() }).eq('id', active.existing.id));
    } else {
      ({ error } = await db.from('activity_form_submissions').insert(payload));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Submitted');
    setActive(null);
    loadAll();
  };

  const dueForms = useMemo(() => forms.filter((f) => {
    const pk = periodKey(f.frequency);
    return !(submissionsByForm[f.id] || []).some((s: any) => s.period_key === pk);
  }), [forms, submissionsByForm]);

  const completedNow = forms.length - dueForms.length;

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
            <FormCard key={f.id} form={f} onClick={() => openForm(f)} />
          ))}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {forms.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No forms have been assigned to you yet.</CardContent></Card>
          ) : forms.map((f) => {
            const pk = periodKey(f.frequency);
            const done = (submissionsByForm[f.id] || []).some((s: any) => s.period_key === pk);
            return <FormCard key={f.id} form={f} done={done} onClick={() => openForm(f)} />;
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
                  <div className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</div>
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
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Calendar className="h-3 w-3" /> Period: {active?.period_key} {active?.existing && <Badge variant="secondary" className="ml-2">Already submitted — editing</Badge>}</div>
          <div className="space-y-4 mt-4">
            {(fieldsByForm[active?.id] || []).map((f, i) => (
              <FieldRenderer
                key={i}
                field={f}
                value={answers[f.field_key]}
                onChange={(v) => setAnswers({ ...answers, [f.field_key]: v })}
                lookupOptions={lookups}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : (active?.existing ? 'Update' : 'Submit')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const FormCard = ({ form, done, onClick }: { form: any; done?: boolean; onClick: () => void }) => (
  <Card className="cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <CardTitle className="text-lg flex items-center gap-2">
            {form.title}
            {done && <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>}
          </CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </div>
        <Badge variant="outline" className="capitalize">{form.frequency.replace('_', ' ')}</Badge>
      </div>
    </CardHeader>
  </Card>
);

export default ActivityReport;
