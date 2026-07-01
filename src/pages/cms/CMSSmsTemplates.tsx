import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Save, Plus, Trash2, Sparkles, Calendar, Users, Briefcase, Wallet, Bell } from 'lucide-react';
import { SchedulePreview } from '@/components/SchedulePreview';

interface SmsTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

interface Holiday { date: string; label: string }

const CMSSmsTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsPageSize] = useState(25);
  const [logsStatus, setLogsStatus] = useState<'all' | 'sent' | 'failed' | 'error'>('all');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsSort, setLogsSort] = useState<'desc' | 'asc'>('desc');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingHolidays, setSavingHolidays] = useState(false);

  const fetchLogs = async () => {
    let q = db.from('sms_logs').select('*', { count: 'exact' });
    if (logsStatus !== 'all') q = q.eq('status', logsStatus);
    if (logsSearch.trim()) {
      const s = `%${logsSearch.trim()}%`;
      q = q.or(`recipient_phone.ilike.${s},body.ilike.${s},template_key.ilike.${s}`);
    }
    q = q.order('created_at', { ascending: logsSort === 'asc' })
      .range(logsPage * logsPageSize, logsPage * logsPageSize + logsPageSize - 1);
    const { data, count } = await q;
    setLogs(data || []);
    setLogsTotal(count || 0);
  };

  const load = async () => {
    setLoading(true);
    const [{ data: tpls }, { data: hol }] = await Promise.all([
      db.from('sms_templates').select('*').order('name'),
      db.from('app_settings').select('value').eq('key', 'holidays').maybeSingle(),
    ]);
    setTemplates(tpls || []);
    let parsed: Holiday[] = [];
    try {
      const v = JSON.parse(hol?.value || '[]');
      if (Array.isArray(v)) parsed = v;
      else if (v && v.date) parsed = [v];
    } catch { parsed = []; }
    setHolidays(parsed.map(h => ({ date: h.date || '', label: h.label || '' })));
    await fetchLogs();
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [logsPage, logsStatus, logsSort]);

  const retrySend = async (logId: string) => {
    setRetrying(logId);
    try {
      const { error } = await supabase.functions.invoke('send-sms', { body: { retry_log_id: logId } });
      if (error) throw error;
      toast({ title: 'Retry attempted' });
      await fetchLogs();
    } catch (e: any) {
      toast({ title: 'Retry failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };


  const updateField = (id: string, patch: Partial<SmsTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const save = async (t: SmsTemplate) => {
    setSaving(t.id);
    const { error } = await db.from('sms_templates').update({
      name: t.name, body: t.body, is_active: t.is_active,
    }).eq('id', t.id);
    setSaving(null);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved', description: `${t.name} updated` });
  };

  const sendTest = async (t: SmsTemplate) => {
    if (!testPhone) {
      toast({ title: 'Phone required', description: 'Enter a test phone number above', variant: 'destructive' });
      return;
    }
    const vars: Record<string, string> = { name: 'Test' };
    (t.variables || []).forEach(v => { if (!vars[v]) vars[v] = `[${v}]`; });
    const { error } = await supabase.functions.invoke('send-sms', {
      body: { to: testPhone, template_key: t.key, vars },
    });
    if (error) toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Test sent', description: `SMS dispatched to ${testPhone}` }); load(); }
  };

  // Holidays
  const addHoliday = () => setHolidays(prev => [...prev, { date: '', label: '' }]);
  const updateHoliday = (i: number, patch: Partial<Holiday>) =>
    setHolidays(prev => prev.map((h, idx) => idx === i ? { ...h, ...patch } : h));
  const removeHoliday = (i: number) => setHolidays(prev => prev.filter((_, idx) => idx !== i));

  const saveHolidays = async () => {
    const cleaned = holidays
      .map(h => ({ date: (h.date || '').trim(), label: (h.label || '').trim() }))
      .filter(h => h.date && h.label);
    setSavingHolidays(true);
    const { error } = await db.from('app_settings').upsert({ key: 'holidays', value: JSON.stringify(cleaned) });
    setSavingHolidays(false);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Holidays saved', description: `${cleaned.length} holiday(s) stored` }); setHolidays(cleaned); }
  };

  const generateQuarter = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-holidays', { body: {} });
      if (error) throw error;
      const items: Holiday[] = (data as any)?.items || [];
      // Merge into form, dedupe by date+label
      setHolidays(prev => {
        const seen = new Set(prev.map(h => `${h.date}|${h.label.toLowerCase()}`));
        const merged = [...prev];
        for (const it of items) {
          const k = `${it.date}|${it.label.toLowerCase()}`;
          if (!seen.has(k)) { merged.push(it); seen.add(k); }
        }
        return merged.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      });
      toast({ title: 'Suggestions added', description: `${items.length} dates suggested — review and Save.` });
    } catch (e: any) {
      toast({ title: 'AI generation failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout title="SMS Templates">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2"><MessageSquare className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-4 w-4" /> Schedule</TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2"><Calendar className="h-4 w-4" /> Holidays</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Test SMS</CardTitle></CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Test phone (e.g. 2348012345678)" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="max-w-xs" />
              <p className="text-xs text-muted-foreground self-center">Use the "Send test" button on a template to dispatch.</p>
            </CardContent>
          </Card>

          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (() => {
            // Group templates by category
            const GROUPS: { label: string; icon: any; keys: string[]; color: string }[] = [
              {
                label: 'Account & Onboarding',
                icon: Users,
                color: 'text-blue-600',
                keys: ['account_approved', 'payslip_generated', 'payslip'],
              },
              {
                label: 'Candidate Pipeline',
                icon: Briefcase,
                color: 'text-purple-600',
                keys: ['candidate_stage', 'candidate_hire', 'candidate_offer'],
              },
              {
                label: 'Finance',
                icon: Wallet,
                color: 'text-emerald-600',
                keys: ['finance_decision'],
              },
              {
                label: 'Staff Notifications',
                icon: Bell,
                color: 'text-amber-600',
                keys: [
                  'staff_finance_request',
                  'staff_new_application',
                  'staff_screening_submitted',
                  'staff_new_user_pending',
                  'staff_interview_scored',
                  'staff_contract_signed',
                  'staff_over_budget_request',
                ],
              },
            ];

            // Any template not in a group goes to "Other"
            const allGroupedKeys = new Set(GROUPS.flatMap(g => g.keys));
            const otherTemplates = templates.filter(t => !allGroupedKeys.has(t.key));

            const renderTemplate = (t: SmsTemplate) => (
              <AccordionItem key={t.id} value={t.id} className="border rounded-xl px-0 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors [&>svg]:shrink-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) => { updateField(t.id, { is_active: v }); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{t.key}</p>
                    </div>
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/10">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={t.name} onChange={(e) => updateField(t.id, { name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Body ({t.body.length} chars)</Label>
                    <Textarea value={t.body} onChange={(e) => updateField(t.id, { body: e.target.value })} rows={3} className="font-mono text-sm mt-1" />
                    {(t.variables?.length ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Variables: {(t.variables || []).map(v => <code key={v} className="mx-0.5 bg-muted px-1 rounded text-[11px]">{`{{${v}}}`}</code>)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => save(t)} disabled={saving === t.id}>
                      <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendTest(t)}>
                      <Send className="h-4 w-4 mr-1" /> Send test
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );

            return (
              <div className="space-y-5">
                {GROUPS.map(group => {
                  const groupTemplates = templates.filter(t => group.keys.includes(t.key));
                  if (groupTemplates.length === 0) return null;
                  const Icon = group.icon;
                  return (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${group.color}`} />
                        <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                        <Badge variant="secondary" className="text-[10px]">{groupTemplates.length}</Badge>
                      </div>
                      <Accordion type="multiple" className="space-y-2">
                        {groupTemplates.map(renderTemplate)}
                      </Accordion>
                    </div>
                  );
                })}
                {otherTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Other</h3>
                      <Badge variant="secondary" className="text-[10px]">{otherTemplates.length}</Badge>
                    </div>
                    <Accordion type="multiple" className="space-y-2">
                      {otherTemplates.map(renderTemplate)}
                    </Accordion>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="schedule">
          <SchedulePreview mode="sms" />
        </TabsContent>

        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Holiday Schedule</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add dates when the holiday SMS template should fire to all approved users.
                    Use a full date like <code>2026-12-25</code>, or <code>MM-DD</code> to repeat every year.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={generateQuarter} disabled={generating}>
                    <Sparkles className="h-4 w-4 mr-1" /> {generating ? 'Generating…' : 'AI: Generate this quarter'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={addHoliday}>
                    <Plus className="h-4 w-4 mr-1" /> Add row
                  </Button>
                  <Button size="sm" onClick={saveHolidays} disabled={savingHolidays}>
                    <Save className="h-4 w-4 mr-1" /> {savingHolidays ? 'Saving…' : 'Save Holidays'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {holidays.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No holidays yet. Add a row or generate suggestions with AI.</p>
              )}
              {holidays.map((h, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 sm:col-span-3">
                    <Input
                      type="text"
                      placeholder="YYYY-MM-DD or MM-DD"
                      value={h.date}
                      onChange={(e) => updateHoliday(i, { date: e.target.value })}
                    />
                  </div>
                  <div className="col-span-7 sm:col-span-8">
                    <Input
                      placeholder="Holiday label (e.g. Christmas Day)"
                      value={h.label}
                      onChange={(e) => updateHoliday(i, { label: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => removeHoliday(i)} title="Remove">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">Delivery logs</CardTitle>
                <p className="text-xs text-muted-foreground">{logsTotal} total</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Input
                  className="max-w-xs h-9"
                  placeholder="Search phone, body, template…"
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setLogsPage(0); fetchLogs(); } }}
                />
                <select
                  className="h-9 px-2 rounded-md border bg-background text-sm"
                  value={logsStatus}
                  onChange={(e) => { setLogsStatus(e.target.value as any); setLogsPage(0); }}
                >
                  <option value="all">All statuses</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="error">Error</option>
                </select>
                <select
                  className="h-9 px-2 rounded-md border bg-background text-sm"
                  value={logsSort}
                  onChange={(e) => setLogsSort(e.target.value as any)}
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => { setLogsPage(0); fetchLogs(); }}>Apply</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{l.template_key || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{l.recipient_phone}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'sent' ? 'default' : 'destructive'}>{l.status}</Badge>
                        {l.error && <p className="text-[10px] text-destructive mt-1 max-w-[180px] truncate" title={l.error}>{l.error}</p>}
                      </TableCell>
                      <TableCell className="text-xs">{l.retry_count ?? 0}</TableCell>
                      <TableCell className="text-xs max-w-md truncate">{l.body}</TableCell>
                      <TableCell>
                        {(l.status === 'failed' || l.status === 'error') && (
                          <Button size="sm" variant="outline" disabled={retrying === l.id} onClick={() => retrySend(l.id)}>
                            {retrying === l.id ? 'Retrying…' : 'Retry'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No SMS records.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {logsPage + 1} of {Math.max(1, Math.ceil(logsTotal / logsPageSize))}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={logsPage === 0} onClick={() => setLogsPage(p => Math.max(0, p - 1))}>Prev</Button>
                  <Button size="sm" variant="outline"
                    disabled={(logsPage + 1) * logsPageSize >= logsTotal}
                    onClick={() => setLogsPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};


export default CMSSmsTemplates;
