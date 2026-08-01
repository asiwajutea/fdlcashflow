import { useEffect, useMemo, useState, ElementType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, format, parseISO, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Loader2, Users, ClipboardList, CheckCircle2, Clock, TrendingUp, Star, MapPin, Calendar } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface Interview {
  id: string;
  created_by: string;
  interviewer_id: string | null;
  field_manager_id: string | null;
  status: string;
  state: string | null;
  city: string | null;
  acceptance_rating: number | null;
  booking_acceptance_rating: number | null;
  created_at: string;
  interview_completed_at: string | null;
  audit_completed_at: string | null;
  total_names: number | null;
}

interface AgentProfile { id: string; full_name: string | null; }

type ViewMode = 'personal' | 'team';
type RangePreset = 'this_month' | 'last_month' | 'last_3' | 'last_6' | 'all_time';

interface Props {
  rows: Interview[];
  isAdmin: boolean;
}

// ─── colour palette ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft:             '#94a3b8',
  pending_interview: '#f59e0b',
  in_progress:       '#3b82f6',
  awaiting_audit:    '#8b5cf6',
  audit_in_progress: '#ec4899',
  completed:         '#22c55e',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', pending_interview: 'Pending', in_progress: 'In Progress',
  awaiting_audit: 'Awaiting Audit', audit_in_progress: 'Audit In Progress', completed: 'Completed',
};
const CHART_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316'];

// ─── date range helper ────────────────────────────────────────────────────────
function getRange(preset: RangePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_month':  return { from: startOfMonth(now),           to: endOfMonth(now) };
    case 'last_month':  return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) };
    case 'last_3':      return { from: startOfMonth(subMonths(now,2)), to: endOfMonth(now) };
    case 'last_6':      return { from: startOfMonth(subMonths(now,5)), to: endOfMonth(now) };
    case 'all_time':    return { from: new Date('2020-01-01'),        to: endOfDay(now) };
  }
}

// ─── metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: ElementType; accent?: string;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className={`p-2 rounded-lg ${accent ?? 'bg-primary/10'}`}>
            <Icon className={`h-4 w-4 ${accent ? 'text-white' : 'text-primary'}`} />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name ?? p.dataKey}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────
export function OralGenOverview({ rows, isAdmin }: Props) {
  const { user } = useAuth();
  const [view,   setView]   = useState<ViewMode>('personal');
  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Load agent profiles for team view
  useEffect(() => {
    if (!isAdmin) return;
    const ids = [...new Set(rows.map(r => r.created_by).filter(Boolean))];
    if (!ids.length) return;
    setAgentsLoading(true);
    db.from('profiles').select('id, full_name').in('id', ids)
      .then(({ data }) => { setAgents((data as AgentProfile[]) || []); setAgentsLoading(false); });
  }, [rows, isAdmin]);

  const agentMap = useMemo(() => {
    const m: Record<string, string> = {};
    agents.forEach(a => { m[a.id] = a.full_name || a.id.slice(0,8); });
    return m;
  }, [agents]);

  // Date range
  const range = useMemo(() => getRange(preset), [preset]);

  // Filter rows by date and view
  const filtered = useMemo(() => {
    let r = rows.filter(row => {
      const d = parseISO(row.created_at);
      return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
    });
    if (view === 'personal' && user?.id) {
      r = r.filter(row =>
        row.created_by === user.id ||
        row.interviewer_id === user.id ||
        row.field_manager_id === user.id
      );
    }
    return r;
  }, [rows, range, view, user?.id]);

  // ── KPI metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total      = filtered.length;
    const completed  = filtered.filter(r => r.status === 'completed').length;
    const inProgress = filtered.filter(r => ['in_progress','audit_in_progress'].includes(r.status)).length;
    const pending    = filtered.filter(r => r.status === 'pending_interview').length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const totalNames = filtered.reduce((s, r) => s + (r.total_names ?? 0), 0);
    const ratingsArr = filtered.map(r => r.acceptance_rating ?? r.booking_acceptance_rating).filter(Boolean) as number[];
    const avgRating  = ratingsArr.length ? (ratingsArr.reduce((a,b)=>a+b,0)/ratingsArr.length).toFixed(1) : '—';
    return { total, completed, inProgress, pending, completionRate, totalNames, avgRating };
  }, [filtered]);

  // ── Status distribution (pie) ─────────────────────────────────────────────
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] ?? status, value, color: STATUS_COLORS[status] ?? '#94a3b8',
    }));
  }, [filtered]);

  // ── Activity trend (line) — daily or weekly buckets ──────────────────────
  const activityTrend = useMemo(() => {
    const days = Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000);
    if (days <= 31) {
      // daily
      return eachDayOfInterval({ start: range.from, end: range.to }).map(day => {
        const count = filtered.filter(r => isSameDay(parseISO(r.created_at), day)).length;
        return { label: format(day, 'MMM d'), count };
      });
    } else {
      // weekly
      return eachWeekOfInterval({ start: range.from, end: range.to }).map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const count = filtered.filter(r => {
          const d = parseISO(r.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return { label: format(weekStart, 'MMM d'), count };
      });
    }
  }, [filtered, range]);

  // ── State distribution (bar) ──────────────────────────────────────────────
  const stateBar = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(r => { if (r.state) counts[r.state] = (counts[r.state] ?? 0) + 1; });
    return Object.entries(counts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));
  }, [filtered]);

  // ── Agent leaderboard (team view only) ───────────────────────────────────
  const agentLeaderboard = useMemo(() => {
    if (view !== 'team') return [];
    const counts: Record<string, { booked: number; interviewed: number; completed: number }> = {};
    filtered.forEach(r => {
      if (r.created_by) {
        if (!counts[r.created_by]) counts[r.created_by] = { booked:0, interviewed:0, completed:0 };
        counts[r.created_by].booked++;
      }
      if (r.interviewer_id) {
        if (!counts[r.interviewer_id]) counts[r.interviewer_id] = { booked:0, interviewed:0, completed:0 };
        counts[r.interviewer_id].interviewed++;
      }
      if (r.status === 'completed' && r.created_by) {
        counts[r.created_by].completed++;
      }
    });
    return Object.entries(counts)
      .map(([id, v]) => ({ id, name: agentMap[id] ?? id.slice(0,8)+'…', ...v, total: v.booked }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, view, agentMap]);

  // ── Rating distribution (bar) ─────────────────────────────────────────────
  const ratingBar = useMemo(() => {
    const counts = [1,2,3,4,5].map(n => ({
      rating: `${n}★`,
      count: filtered.filter(r => (r.acceptance_rating ?? r.booking_acceptance_rating) === n).length,
    }));
    return counts;
  }, [filtered]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Performance Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(range.from, 'MMM d, yyyy')} — {format(range.to, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Personal / Team toggle */}
          {isAdmin && (
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                className={`px-3 py-1.5 transition-colors ${view === 'personal' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                onClick={() => setView('personal')}
              >My Performance</button>
              <button
                className={`px-3 py-1.5 transition-colors ${view === 'team' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                onClick={() => setView('team')}
              >Team Overview</button>
            </div>
          )}
          {/* Date range */}
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger className="h-8 text-xs w-40">
              <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3">Last 3 Months</SelectItem>
              <SelectItem value="last_6">Last 6 Months</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Records"    value={metrics.total}           icon={ClipboardList} />
        <MetricCard label="Completed"        value={metrics.completed}       icon={CheckCircle2} accent="bg-green-500" />
        <MetricCard label="In Progress"      value={metrics.inProgress}      icon={Clock}        accent="bg-blue-500" />
        <MetricCard label="Pending"          value={metrics.pending}         icon={Users}        accent="bg-amber-500" />
        <MetricCard label="Completion Rate"  value={`${metrics.completionRate}%`} icon={TrendingUp} accent="bg-primary" />
        <MetricCard label="Avg. Rating"      value={metrics.avgRating}       icon={Star}         accent="bg-purple-500"
          sub={`from ${filtered.filter(r => r.acceptance_rating || r.booking_acceptance_rating).length} rated`} />
      </div>

      {/* ── Row 1: Activity trend + Status distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity trend — takes 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {preset === 'this_month' || preset === 'last_month' ? 'Daily Activity' : 'Weekly Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityTrend.every(d => d.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityTrend} barSize={preset === 'this_month' ? 10 : 18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    interval={activityTrend.length > 20 ? 3 : 0} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Records" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution — 1/3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={2} dataKey="value">
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {statusPie.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Geographic distribution + Rating breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* State distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateBar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No location data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stateBar} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Records" radius={[0,3,3,0]}>
                    {stateBar.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-muted-foreground" /> Acceptance Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ratingBar.every(r => r.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No ratings recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ratingBar} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="rating" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Interviews" radius={[4,4,0,0]}>
                    {ratingBar.map((_, i) => {
                      const colors = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'];
                      return <Cell key={i} fill={colors[i]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Team leaderboard (admin team view only) ── */}
      {view === 'team' && isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> Agent Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading agent data…
              </div>
            ) : agentLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No agent activity in this period.</p>
            ) : (
              <>
                {/* Bar chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agentLeaderboard} margin={{ bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      interval={0} angle={-25} textAnchor="end" height={44} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="booked"      name="Booked"      fill="#3b82f6" radius={[3,3,0,0]} />
                    <Bar dataKey="interviewed" name="Interviewed" fill="#22c55e" radius={[3,3,0,0]} />
                    <Bar dataKey="completed"   name="Completed"   fill="#8b5cf6" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Ranked table */}
                <div className="mt-4 space-y-1">
                  {agentLeaderboard.map((agent, idx) => (
                    <div key={agent.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                        idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'
                      }`}>#{idx + 1}</span>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{agent.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          {agent.booked} booked
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {agent.interviewed} interviewed
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          {agent.completed} done
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Personal highlights (personal view) ── */}
      {view === 'personal' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">My Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'I Booked',      value: filtered.filter(r => r.created_by === user?.id).length,      color: 'text-blue-600' },
                { label: 'I Interviewed', value: filtered.filter(r => r.interviewer_id === user?.id).length,  color: 'text-green-600' },
                { label: 'I Audited',     value: filtered.filter(r => r.field_manager_id === user?.id).length, color: 'text-purple-600' },
                { label: 'Completed',     value: filtered.filter(r => r.status === 'completed' && (r.created_by === user?.id || r.interviewer_id === user?.id)).length, color: 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl border bg-muted/30 space-y-1">
                  <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default OralGenOverview;
