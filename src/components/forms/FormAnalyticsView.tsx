import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/supabase-db';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, ClipboardCheck, Calendar, Settings2 } from 'lucide-react';

interface Props {
  formId: string;
  mode: 'admin' | 'employee-aggregate' | 'submitter';
  currentUserId?: string;
}

const COLORS = ['hsl(var(--primary))', '#FF7A00', '#0B1F3B', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4'];

const FormAnalyticsView = ({ formId, mode, currentUserId }: Props) => {
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [range, setRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: f }, { data: ff }, { data: ss }] = await Promise.all([
      db.from('activity_forms').select('*').eq('id', formId).single(),
      db.from('activity_form_fields').select('*').eq('form_id', formId).order('display_order'),
      db.from('activity_form_submissions').select('*').eq('form_id', formId).order('submitted_at', { ascending: false }),
    ]);
    setForm(f);
    setFields(ff || []);
    let subs = ss || [];
    if (mode === 'submitter' && currentUserId) {
      subs = subs.filter((s: any) => s.user_id === currentUserId);
    }
    setSubmissions(subs);
    const userIds = [...new Set(subs.map((s: any) => s.user_id))];
    if (userIds.length) {
      const { data: ps } = await db.from('profiles').select('id,full_name').in('id', userIds);
      const map: any = {};
      (ps || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [formId, mode, currentUserId]);

  const filteredSubs = useMemo(() => {
    if (range === 'all') return submissions;
    const cutoff = Date.now() - parseInt(range) * 86400000;
    return submissions.filter((s) => new Date(s.submitted_at).getTime() >= cutoff);
  }, [submissions, range]);

  // Determine which fields to show
  const visibleFields = useMemo(() => {
    const dataFields = fields.filter((f) => !['page_break', 'section'].includes(f.field_type));
    if (mode === 'admin' || mode === 'submitter') return dataFields;
    const allowed: string[] = form?.analytics_visible_fields || [];
    return dataFields.filter((f) => allowed.includes(f.field_key));
  }, [fields, form, mode]);

  // KPIs
  const totalSubs = filteredSubs.length;
  const uniqueSubmitters = new Set(filteredSubs.map((s) => s.user_id)).size;
  const last7 = filteredSubs.filter((s) => Date.now() - new Date(s.submitted_at).getTime() < 7 * 86400000).length;

  // Submissions over time chart
  const timeSeries = useMemo(() => {
    const buckets: Record<string, number> = {};
    filteredSubs.forEach((s) => {
      const day = new Date(s.submitted_at).toISOString().slice(0, 10);
      buckets[day] = (buckets[day] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredSubs]);

  // Top submitters
  const topSubmitters = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSubs.forEach((s) => { counts[s.user_id] = (counts[s.user_id] || 0) + 1; });
    return Object.entries(counts)
      .map(([uid, n]) => ({ name: profiles[uid]?.full_name || 'Unknown', count: n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSubs, profiles]);

  // Per-field analytics
  const fieldStats = useMemo(() => {
    return visibleFields.map((field) => {
      const values = filteredSubs.map((s) => s.answers?.[field.field_key]).filter((v) => v !== undefined && v !== null && v !== '');

      if (['select', 'radio'].includes(field.field_type)) {
        const counts: Record<string, number> = {};
        values.forEach((v) => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
        return { field, type: 'category', data: Object.entries(counts).map(([name, value]) => ({ name, value })) };
      }
      if (['multiselect', 'checkbox'].includes(field.field_type) && Array.isArray(field.options) && field.options.length > 0) {
        const counts: Record<string, number> = {};
        values.forEach((v) => {
          const arr = Array.isArray(v) ? v : [v];
          arr.forEach((item: any) => { counts[String(item)] = (counts[String(item)] || 0) + 1; });
        });
        return { field, type: 'category', data: Object.entries(counts).map(([name, value]) => ({ name, value })) };
      }
      if (field.field_type === 'number' || field.field_type === 'rating') {
        const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
        if (nums.length === 0) return { field, type: 'empty' };
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        // Histogram
        const buckets: Record<string, number> = {};
        nums.forEach((n) => {
          const key = field.field_type === 'rating' ? String(Math.round(n)) : String(Math.floor(n));
          buckets[key] = (buckets[key] || 0) + 1;
        });
        const hist = Object.entries(buckets).sort(([a], [b]) => Number(a) - Number(b)).map(([name, value]) => ({ name, value }));
        return { field, type: 'numeric', avg, min, max, sum, count: nums.length, data: hist };
      }
      if (field.field_type === 'checkbox') {
        // boolean
        let yes = 0, no = 0;
        values.forEach((v) => { v === true || v === 'true' ? yes++ : no++; });
        return { field, type: 'category', data: [{ name: 'Yes', value: yes }, { name: 'No', value: no }] };
      }
      // text/textarea/date/file/signature
      return { field, type: 'samples', samples: values.slice(0, 5).map(String), count: values.length };
    });
  }, [visibleFields, filteredSubs]);

  // --- Admin visibility controls ---
  const [empVisible, setEmpVisible] = useState(false);
  const [submitterVisible, setSubmitterVisible] = useState(true);
  const [allowedFields, setAllowedFields] = useState<string[]>([]);
  useEffect(() => {
    if (form) {
      setEmpVisible(!!form.analytics_employee_visible);
      setSubmitterVisible(form.analytics_visible_to_submitter !== false);
      setAllowedFields(form.analytics_visible_fields || []);
    }
  }, [form]);

  const saveVisibility = async () => {
    setSaving(true);
    const { error } = await db.from('activity_forms').update({
      analytics_employee_visible: empVisible,
      analytics_visible_to_submitter: submitterVisible,
      analytics_visible_fields: allowedFields,
    }).eq('id', formId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Visibility settings saved');
    load();
  };

  if (!form) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{form.title} — Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'admin' && 'Full analytics view (admin)'}
            {mode === 'employee-aggregate' && 'Team aggregate view'}
            {mode === 'submitter' && 'Your personal submissions'}
          </p>
        </div>
        <Select value={range} onValueChange={(v: any) => setRange(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Admin visibility panel */}
      {mode === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> Employee Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label className="flex flex-col gap-1">
                <span>Allow assigned employees to view team analytics</span>
                <span className="text-xs text-muted-foreground font-normal">Aggregated charts only — no individual submitter PII</span>
              </Label>
              <Switch checked={empVisible} onCheckedChange={setEmpVisible} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="flex flex-col gap-1">
                <span>Allow submitters to view their personal analytics</span>
                <span className="text-xs text-muted-foreground font-normal">Each user only sees their own submissions</span>
              </Label>
              <Switch checked={submitterVisible} onCheckedChange={setSubmitterVisible} />
            </div>
            {empVisible && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Fields visible to employees in team analytics</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {fields.filter((f) => !['page_break', 'section'].includes(f.field_type)).map((f) => (
                    <label key={f.id} className="flex items-center gap-2 p-2 rounded border bg-card cursor-pointer hover:bg-accent/30">
                      <Checkbox
                        checked={allowedFields.includes(f.field_key)}
                        onCheckedChange={(c) => {
                          if (c) setAllowedFields([...allowedFields, f.field_key]);
                          else setAllowedFields(allowedFields.filter((k) => k !== f.field_key));
                        }}
                      />
                      <span className="text-sm">{f.label}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{f.field_type}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={saveVisibility} disabled={saving}>{saving ? 'Saving…' : 'Save Visibility Settings'}</Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ClipboardCheck} label="Total submissions" value={totalSubs} />
        {mode !== 'submitter' && <KpiCard icon={Users} label="Unique submitters" value={uniqueSubmitters} />}
        <KpiCard icon={TrendingUp} label="Last 7 days" value={last7} />
        <KpiCard icon={Calendar} label="Frequency" value={form.frequency} small />
      </div>

      {/* Submissions over time */}
      <Card>
        <CardHeader><CardTitle className="text-base">Submissions over time</CardTitle></CardHeader>
        <CardContent>
          {timeSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-field charts */}
      {visibleFields.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No fields are configured for visibility.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fieldStats.map(({ field, ...rest }: any) => (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{field.label}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{field.field_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rest.type === 'category' && rest.data.length > 0 ? (
                  rest.data.length <= 6 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={rest.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                          {rest.data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={rest.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : rest.type === 'numeric' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-xs text-muted-foreground">Avg</div><div className="font-bold">{rest.avg.toFixed(1)}</div></div>
                      <div><div className="text-xs text-muted-foreground">Min</div><div className="font-bold">{rest.min}</div></div>
                      <div><div className="text-xs text-muted-foreground">Max</div><div className="font-bold">{rest.max}</div></div>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={rest.data}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="#FF7A00" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : rest.type === 'samples' ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{rest.count} response(s)</p>
                    {rest.samples.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No responses</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {rest.samples.map((s: string, i: number) => (
                          <li key={i} className="p-2 rounded bg-muted text-foreground truncate">{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Top submitters (admin only) */}
      {mode === 'admin' && topSubmitters.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top submitters</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead className="text-right">Submissions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {topSubmitters.map((s, i) => (
                  <TableRow key={i}><TableCell>{s.name}</TableCell><TableCell className="text-right font-mono">{s.count}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, small }: any) => (
  <Card>
    <CardContent className="pt-6 flex items-center gap-3">
      <Icon className="h-8 w-8 text-primary" />
      <div className="min-w-0">
        <div className={`font-bold ${small ? 'text-lg capitalize' : 'text-2xl'}`}>{value}</div>
        <div className="text-sm text-muted-foreground truncate">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export default FormAnalyticsView;
