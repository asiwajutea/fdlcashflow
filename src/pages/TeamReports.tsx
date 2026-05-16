import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useIsLeader } from '@/hooks/useIsLeader';
import { db } from '@/lib/supabase-db';
import { TrendingUp, TrendingDown, Wallet, FileText, Users } from 'lucide-react';

type Range = '7' | '30' | '90' | '365';

const startFromRange = (r: Range) => {
  const d = new Date();
  d.setDate(d.getDate() - Number(r));
  return d.toISOString().slice(0, 10);
};

const fmt = (n: number) =>
  '₦' + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const TeamReports = () => {
  const { isLeader, subordinateIds, loading: leaderLoading } = useIsLeader();
  const [range, setRange] = useState<Range>('30');
  const [member, setMember] = useState<string>('all');
  const [members, setMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [forms, setForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Resolve member display names
  useEffect(() => {
    if (subordinateIds.length === 0) { setMembers([]); return; }
    (async () => {
      const { data } = await db.from('profiles').select('id, full_name').in('id', subordinateIds);
      setMembers(data || []);
    })();
  }, [subordinateIds.join(',')]);

  // Fetch data
  useEffect(() => {
    if (!isLeader) return;
    const ids = member === 'all' ? subordinateIds : [member];
    if (ids.length === 0) return;
    const start = startFromRange(range);
    setLoading(true);
    (async () => {
      const [tx, subs] = await Promise.all([
        db.from('daily_transactions').select('*').in('created_by', ids).gte('date', start).order('date', { ascending: false }),
        db.from('activity_form_submissions').select('*').in('user_id', ids).gte('submitted_at', start + 'T00:00:00').order('submitted_at', { ascending: false }),
      ]);
      setTransactions(tx.data || []);
      setSubmissions(subs.data || []);

      const formIds = Array.from(new Set((subs.data || []).map((s: any) => s.form_id)));
      if (formIds.length) {
        const { data: fs } = await db.from('activity_forms').select('id, title').in('id', formIds);
        const map: Record<string, string> = {};
        (fs || []).forEach((f: any) => { map[f.id] = f.title; });
        setForms(map);
      } else {
        setForms({});
      }
      setLoading(false);
    })();
  }, [isLeader, subordinateIds.join(','), member, range]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    const byDate: Record<string, { date: string; income: number; expense: number }> = {};
    transactions.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt; else expense += amt;
      if (!byDate[t.date]) byDate[t.date] = { date: t.date, income: 0, expense: 0 };
      if (t.type === 'income') byDate[t.date].income += amt; else byDate[t.date].expense += amt;
    });
    const trend = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    return { income, expense, net: income - expense, trend };
  }, [transactions]);

  const submissionsByForm = useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s: any) => { map[s.form_id] = (map[s.form_id] || 0) + 1; });
    return Object.entries(map).map(([id, count]) => ({ name: forms[id] || 'Form', count }));
  }, [submissions, forms]);

  const memberStats = useMemo(() => {
    const m: Record<string, { id: string; subs: number; last: string | null }> = {};
    submissions.forEach((s: any) => {
      if (!m[s.user_id]) m[s.user_id] = { id: s.user_id, subs: 0, last: null };
      m[s.user_id].subs += 1;
      if (!m[s.user_id].last || s.submitted_at > m[s.user_id].last!) m[s.user_id].last = s.submitted_at;
    });
    return members.map(mb => ({
      ...mb,
      subs: m[mb.id]?.subs || 0,
      last: m[mb.id]?.last || null,
    }));
  }, [submissions, members]);

  if (leaderLoading) {
    return <DashboardLayout title="Team Reports"><div className="py-12 text-center text-muted-foreground">Loading…</div></DashboardLayout>;
  }

  if (!isLeader) {
    return (
      <DashboardLayout title="Team Reports">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          You do not currently lead any team members. Once you are assigned as a manager, department head, project or team lead, your team's summary will appear here.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Team Reports">
      <div className="space-y-6">
        {/* Header + filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">My Team</h2>
            <p className="text-sm text-muted-foreground">
              Summary of your downline's finances and activity submissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3.5 w-3.5" /> {subordinateIds.length} member{subordinateIds.length === 1 ? '' : 's'}
            </Badge>
            <Select value={member} onValueChange={setMember}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All team members</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name || m.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(stats.income)}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(stats.expense)}</p>
                </div>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Net Balance</p>
                  <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-foreground' : 'text-destructive'}`}>{fmt(stats.net)}</p>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Form Submissions</p>
                  <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
            <CardContent>
              {stats.trend.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No transactions in this range</div>
              ) : (
                <ChartContainer config={{ income: { label: 'Income', color: 'hsl(var(--primary))' }, expense: { label: 'Expense', color: 'hsl(var(--destructive))' } }} className="h-56">
                  <AreaChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="income" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.2} />
                    <Area dataKey="expense" stroke="var(--color-expense)" fill="var(--color-expense)" fillOpacity={0.2} />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Submissions per Form</CardTitle></CardHeader>
            <CardContent>
              {submissionsByForm.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No submissions in this range</div>
              ) : (
                <ChartContainer config={{ count: { label: 'Submissions', color: 'hsl(var(--primary))' } }} className="h-56">
                  <BarChart data={submissionsByForm}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead>Last submission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberStats.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No team members</TableCell></TableRow>
                ) : memberStats.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name || m.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">{m.subs}</TableCell>
                    <TableCell>{m.last ? new Date(m.last).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Submissions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">{loading ? 'Loading…' : 'No submissions'}</TableCell></TableRow>
                ) : submissions.slice(0, 20).map((s: any) => {
                  const name = members.find(mm => mm.id === s.user_id)?.full_name || s.user_id.slice(0, 8);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{forms[s.form_id] || '—'}</TableCell>
                      <TableCell>{new Date(s.submitted_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/activity-report/${s.form_id}/analytics`}>
                          <Button size="sm" variant="ghost">View form</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeamReports;
