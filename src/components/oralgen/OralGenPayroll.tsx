/**
 * OralGenPayroll — Admin Payroll Configuration & Team Pay Summary tab
 *
 * Layout:
 *   [Admin only] Settings panel — role defaults + per-employee overrides
 *   Toggle: My Pay / Team Payroll (admin / oralgen_admin)
 *   Date range filter + sort
 *   Pay summary cards + sortable breakdown table
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  Loader2, Settings2, ChevronDown, ChevronUp, Save,
  Banknote, Users, TrendingUp, Target, AlertCircle,
  CheckCircle2, XCircle, Calendar,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface Interview {
  id: string;
  created_by: string;
  interviewer_id: string | null;
  field_manager_id: string | null;
  status: string;
  total_names: number | null;
  interview_completed_at: string | null;
  audit_completed_at: string | null;
  created_at: string;
}

interface PayConfig {
  role: 'interviewer' | 'field_manager';
  base_salary: number;
  base_qualify_names: number;
  monthly_quota: number;
  commission_amount: number;
}

interface PayOverride {
  id?: string;
  user_id: string;
  base_salary: number | null;
  base_qualify_names: number | null;
  monthly_quota: number | null;
  commission_amount: number | null;
  notes: string | null;
}

interface AgentProfile {
  id: string;
  full_name: string | null;
  role: 'interviewer' | 'field_manager' | null;
  // effective config (from view)
  base_salary: number;
  base_qualify_names: number;
  monthly_quota: number;
  commission_amount: number;
  has_override: boolean;
}

type RangePreset = 'this_month' | 'last_month' | 'last_3' | 'last_6';
type SortKey = 'name' | 'names' | 'base' | 'commission' | 'total';
type ViewMode = 'personal' | 'team';

interface Props {
  rows: Interview[];         // all oralgen_interviews visible to this user
  isAdmin: boolean;
  canAudit: boolean;
  canInterview: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => n.toLocaleString('en-NG');

function getRange(preset: RangePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_month':  return { from: startOfMonth(now),             to: endOfMonth(now) };
    case 'last_month':  return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) };
    case 'last_3':      return { from: startOfMonth(subMonths(now,2)), to: endOfMonth(now) };
    case 'last_6':      return { from: startOfMonth(subMonths(now,5)), to: endOfMonth(now) };
  }
}

/**
 * Core pay calculation — deterministic, pure function.
 * Returns basePay, commission, total, qualified (names >= threshold).
 */
function calcPay(names: number, cfg: Pick<AgentProfile, 'base_salary'|'base_qualify_names'|'monthly_quota'|'commission_amount'>) {
  const qualified = names >= cfg.base_qualify_names;
  const base       = qualified ? cfg.base_salary : 0;
  const quotaRatio = cfg.monthly_quota > 0 ? Math.min(names / cfg.monthly_quota, 1) : 0;
  const commission = qualified ? quotaRatio * cfg.commission_amount : 0;
  return { base, commission, total: base + commission, qualified, quotaRatio };
}

// ─── RoleConfigCard — edit base role defaults ─────────────────────────────────

function RoleConfigCard({
  config, onSaved,
}: { config: PayConfig; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (patch: Partial<typeof form>) => { setForm(f => ({ ...f, ...patch })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    const { error } = await db.from('oralgen_pay_config').update({
      base_salary:        form.base_salary,
      base_qualify_names: form.base_qualify_names,
      monthly_quota:      form.monthly_quota,
      commission_amount:  form.commission_amount,
    }).eq('role', form.role);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    setDirty(false);
    toast({ title: `${form.role === 'interviewer' ? 'Field Agent' : 'Field Manager'} defaults saved` });
    onSaved();
  };

  const roleLabel = config.role === 'interviewer' ? 'Field Agent (Interviewer)' : 'Field Manager (Auditor)';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>{roleLabel}</span>
          <Badge variant="outline" className="text-xs font-normal">Role default</Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Applies to all {roleLabel.toLowerCase()}s unless a per-employee override exists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Base Salary (₦ / month)</Label>
            <Input type="number" min="0" value={form.base_salary}
              onChange={e => set({ base_salary: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Commission at 100% quota (₦)</Label>
            <Input type="number" min="0" value={form.commission_amount}
              onChange={e => set({ commission_amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monthly Quota (names)</Label>
            <Input type="number" min="1" value={form.monthly_quota}
              onChange={e => set({ monthly_quota: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min. names to qualify (names)</Label>
            <Input type="number" min="1" value={form.base_qualify_names}
              onChange={e => set({ base_qualify_names: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── EmployeeOverrideRow — inline per-employee override editor ────────────────

function EmployeeOverrideRow({
  agent, onSaved,
}: { agent: AgentProfile; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<PayOverride, 'id' | 'user_id'>>({
    base_salary: null, base_qualify_names: null,
    monthly_quota: null, commission_amount: null, notes: null,
  });
  const [saving, setSaving] = useState(false);

  // Load existing override when expanding
  useEffect(() => {
    if (!open) return;
    db.from('oralgen_pay_override').select('*').eq('user_id', agent.id).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          base_salary:        (data as any).base_salary,
          base_qualify_names: (data as any).base_qualify_names,
          monthly_quota:      (data as any).monthly_quota,
          commission_amount:  (data as any).commission_amount,
          notes:              (data as any).notes,
        });
      });
  }, [open, agent.id]);

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    const payload = { user_id: agent.id, ...form };
    const { error } = await db.from('oralgen_pay_override').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Override saved for ${agent.full_name}` });
    setOpen(false);
    onSaved();
  };

  const clearOverride = async () => {
    if (!confirm(`Remove override for ${agent.full_name}? They will revert to role defaults.`)) return;
    await db.from('oralgen_pay_override').delete().eq('user_id', agent.id);
    toast({ title: 'Override removed' });
    onSaved();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{agent.full_name || agent.id.slice(0,8)}</span>
          <span className="text-xs text-muted-foreground">
            {agent.role === 'interviewer' ? 'Field Agent' : 'Field Manager'}
          </span>
          {agent.has_override && (
            <Badge variant="secondary" className="text-xs py-0">Custom rates</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span>{fmt(agent.base_salary)}/mo</span>
          <span>Quota: {fmtNum(agent.monthly_quota)}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/20 space-y-3">
          <p className="text-xs text-muted-foreground">
            Leave a field empty to inherit the role default.
            Effective values shown in the pay table.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'base_salary',        label: 'Base Salary (₦)',      placeholder: String(agent.base_salary) },
              { key: 'commission_amount',  label: 'Commission at 100% (₦)', placeholder: String(agent.commission_amount) },
              { key: 'monthly_quota',      label: 'Monthly Quota',         placeholder: String(agent.monthly_quota) },
              { key: 'base_qualify_names', label: 'Min. qualify names',    placeholder: String(agent.base_qualify_names) },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number" min="0"
                  placeholder={`default: ${f.placeholder}`}
                  value={(form as any)[f.key] ?? ''}
                  onChange={e => set({ [f.key]: e.target.value === '' ? null : Number(e.target.value) } as any)}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Input placeholder="Reason for override…" value={form.notes ?? ''}
              onChange={e => set({ notes: e.target.value || null })} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {agent.has_override && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs"
                onClick={clearOverride}>
                Remove override
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save override
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function OralGenPayroll({ rows, isAdmin, canAudit, canInterview }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const canSeeTeam = isAdmin;

  // ── UI state ────────────────────────────────────────────────────────────
  const [view,           setView]          = useState<ViewMode>(isAdmin ? 'team' : 'personal');
  const [preset,         setPreset]        = useState<RangePreset>('this_month');
  const [sortKey,        setSortKey]       = useState<SortKey>('total');
  const [sortAsc,        setSortAsc]       = useState(false);
  const [settingsOpen,   setSettingsOpen]  = useState(false);
  const [calcOpen,       setCalcOpen]      = useState(false);
  const [histOpen,       setHistOpen]      = useState(false);

  // ── Data state ──────────────────────────────────────────────────────────
  const [roleConfigs,    setRoleConfigs]   = useState<PayConfig[]>([]);
  const [agents,         setAgents]        = useState<AgentProfile[]>([]);
  const [loadingConfig,  setLoadingConfig] = useState(false);

  // ── Date range ──────────────────────────────────────────────────────────
  const range = useMemo(() => getRange(preset), [preset]);

  // ── Load role configs + effective agent profiles (admin only) ────────────
  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [{ data: cfgs }, { data: eff }] = await Promise.all([
        db.from('oralgen_pay_config').select('*').order('role'),
        db.from('oralgen_pay_effective').select('*'),
      ]);
      setRoleConfigs((cfgs as PayConfig[]) || []);
      setAgents((eff as AgentProfile[]) || []);
    } catch (e: any) {
      toast({ title: 'Could not load pay config', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingConfig(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadConfig();
  }, [isAdmin, loadConfig]);

  // ── Agent map for non-admin personal view ────────────────────────────────
  // For non-admins we still need their own effective config
  const [myConfig, setMyConfig] = useState<AgentProfile | null>(null);
  useEffect(() => {
    if (isAdmin || !user?.id) return;
    db.from('oralgen_pay_effective').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setMyConfig(data as AgentProfile | null));
  }, [isAdmin, user?.id]);

  // ── Count names per agent within the date range ──────────────────────────
  // Field agents: credited for names on records they personally interviewed.
  // Field managers: credited for the TEAM's total — all names on records
  //   under their management (field_manager_id = their id), regardless of
  //   which interviewer did the work. This is their team performance quota.
  const namesByAgent = useMemo(() => {
    // Two separate accumulators so the semantics are explicit
    const interviewerNames: Record<string, number> = {};  // personal output
    const managerNames:     Record<string, number> = {};  // team output

    rows.forEach(r => {
      const names = r.total_names ?? 0;
      if (names <= 0) return;

      // Use the most authoritative completion timestamp available:
      // 1. audit_completed_at  — final sign-off by field manager
      // 2. interview_completed_at — when field agent submitted names
      // 3. created_at — fallback only
      const relevantDate = r.audit_completed_at ?? r.interview_completed_at ?? r.created_at;
      try {
        const d = parseISO(relevantDate);
        if (!isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) })) return;
      } catch { return; }

      // Credit interviewer with their personal names
      if (r.interviewer_id) {
        interviewerNames[r.interviewer_id] = (interviewerNames[r.interviewer_id] ?? 0) + names;
      }

      // Credit field manager with their TEAM's names (all records they managed)
      if (r.field_manager_id) {
        managerNames[r.field_manager_id] = (managerNames[r.field_manager_id] ?? 0) + names;
      }
    });

    // Merge: use the correct counter based on each agent's actual role
    // Build a role lookup from the agents array (populated from oralgen_pay_effective)
    const agentRoleMap: Record<string, 'interviewer' | 'field_manager' | null> = {};
    agents.forEach(a => { agentRoleMap[a.id] = a.role; });

    const counts: Record<string, number> = {};

    // Add all IDs that appear in either counter
    const allIds = new Set([
      ...Object.keys(interviewerNames),
      ...Object.keys(managerNames),
    ]);

    allIds.forEach(id => {
      const role = agentRoleMap[id];
      if (role === 'field_manager') {
        // Field manager quota = team output (all records they managed)
        counts[id] = managerNames[id] ?? 0;
      } else {
        // Field agent / interviewer quota = personal output
        // Also fall back to managerNames if they happen to appear there too
        counts[id] = interviewerNames[id] ?? managerNames[id] ?? 0;
      }
    });

    return counts;
  }, [rows, range, agents]);

  // ── Build pay rows ───────────────────────────────────────────────────────
  const payRows = useMemo(() => {
    if (view === 'personal') {
      const cfg = myConfig ?? agents.find(a => a.id === user?.id);
      if (!cfg) return [];
      // For personal view, recompute names directly from rows using role-aware logic
      const uid = user?.id ?? '';
      const names = cfg.role === 'field_manager'
        ? rows.filter(r => {
            if ((r.total_names ?? 0) <= 0) return false;
            const d = (() => { try { return parseISO(r.audit_completed_at ?? r.interview_completed_at ?? r.created_at); } catch { return null; } })();
            return d && isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) }) && r.field_manager_id === uid;
          }).reduce((s, r) => s + (r.total_names ?? 0), 0)
        : namesByAgent[uid] ?? 0;
      const pay = calcPay(names, cfg);
      return [{ ...cfg, names, ...pay }];
    }
    // Team view — all agents
    return agents.map(agent => {
      const names = namesByAgent[agent.id] ?? 0;
      const pay   = calcPay(names, agent);
      return { ...agent, names, ...pay };
    });
  }, [view, agents, myConfig, namesByAgent, user?.id]);

  // ── Month-by-month history (personal view — last 6 months) ──────────────
  const monthlyHistory = useMemo(() => {
    if (view !== 'personal' || !user?.id) return [];
    const cfg = myConfig ?? agents.find(a => a.id === user.id);
    if (!cfg) return [];

    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd   = endOfMonth(subMonths(now, i));
      const names = rows
        .filter(r => {
          if ((r.total_names ?? 0) <= 0) return false;
          const relevantDate = r.audit_completed_at ?? r.interview_completed_at ?? r.created_at;
          try {
            const d = parseISO(relevantDate);
            if (!isWithinInterval(d, { start: startOfDay(monthStart), end: endOfDay(monthEnd) })) return false;
          } catch { return false; }
          // Field manager: count all records they managed (team output)
          // Field agent: count only records they personally interviewed
          if (cfg.role === 'field_manager') return r.field_manager_id === user.id;
          return r.interviewer_id === user.id;
        })
        .reduce((s, r) => s + (r.total_names ?? 0), 0);

      const pay = calcPay(names, cfg);
      return {
        month:  format(monthStart, 'MMM yyyy'),
        names,
        ...pay,
        quota:  cfg.monthly_quota,
        threshold: cfg.base_qualify_names,
      };
    }).reverse(); // oldest → newest
  }, [view, user?.id, myConfig, agents, rows]);
  const sorted = useMemo(() => {
    return [...payRows].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'name':       diff = (a.full_name ?? '').localeCompare(b.full_name ?? ''); break;
        case 'names':      diff = a.names - b.names; break;
        case 'base':       diff = a.base - b.base; break;
        case 'commission': diff = a.commission - b.commission; break;
        case 'total':      diff = a.total - b.total; break;
      }
      return sortAsc ? diff : -diff;
    });
  }, [payRows, sortKey, sortAsc]);

  // ── Team summary KPIs ────────────────────────────────────────────────────
  const teamKpis = useMemo(() => {
    if (view !== 'team') return null;
    const totalBase       = sorted.reduce((s, r) => s + r.base, 0);
    const totalCommission = sorted.reduce((s, r) => s + r.commission, 0);
    const totalPay        = sorted.reduce((s, r) => s + r.total, 0);
    const totalNames      = sorted.reduce((s, r) => s + r.names, 0);
    const qualified       = sorted.filter(r => r.qualified).length;
    return { totalBase, totalCommission, totalPay, totalNames, qualified, headcount: sorted.length };
  }, [sorted, view]);

  // ── Sort helper ──────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />)
      : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Payroll</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(range.from, 'MMM d, yyyy')} — {format(range.to, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Personal / Team toggle */}
          {canSeeTeam && (
            <div className="flex rounded-lg border overflow-hidden text-xs">
              <button
                className={`px-3 py-1.5 transition-colors ${view === 'personal' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                onClick={() => setView('personal')}
              >My Pay</button>
              <button
                className={`px-3 py-1.5 transition-colors ${view === 'team' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                onClick={() => setView('team')}
              >Team Payroll</button>
            </div>
          )}
          {/* Date range */}
          <Select value={preset} onValueChange={v => setPreset(v as RangePreset)}>
            <SelectTrigger className="h-8 text-xs w-40">
              <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3">Last 3 Months</SelectItem>
              <SelectItem value="last_6">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
          {/* Settings toggle — admin only */}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(v => !v)} className="gap-1.5 h-8 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              {settingsOpen ? 'Hide Settings' : 'Pay Settings'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Admin settings panel ── */}
      {isAdmin && settingsOpen && (
        <div className="space-y-4 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Pay Configuration</span>
            <span className="text-xs text-muted-foreground">— changes apply immediately to future pay calculations</span>
          </div>

          {loadingConfig ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading config…
            </div>
          ) : (
            <>
              {/* Role defaults */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Role Defaults</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {roleConfigs.map(cfg => (
                    <RoleConfigCard key={cfg.role} config={cfg} onSaved={loadConfig} />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Per-employee overrides */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Per-Employee Overrides
                  <span className="ml-1.5 font-normal normal-case">
                    — optional; overrides role defaults for specific employees
                  </span>
                </p>
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No oralgen employees found.</p>
                ) : (
                  <div className="space-y-2">
                    {agents.map(agent => (
                      <EmployeeOverrideRow key={agent.id} agent={agent} onSaved={loadConfig} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Team KPI summary cards ── */}
      {view === 'team' && teamKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Base',       value: fmt(teamKpis.totalBase),       icon: Banknote,    color: 'bg-blue-500' },
            { label: 'Total Commission', value: fmt(teamKpis.totalCommission),  icon: TrendingUp,  color: 'bg-green-500' },
            { label: 'Total Payroll',    value: fmt(teamKpis.totalPay),         icon: Banknote,    color: 'bg-primary' },
            { label: 'Names Collected',  value: fmtNum(teamKpis.totalNames),    icon: Target,      color: 'bg-cyan-500' },
            { label: 'Qualified',        value: teamKpis.qualified,             icon: CheckCircle2,color: 'bg-emerald-500' },
            { label: 'Agents',           value: teamKpis.headcount,             icon: Users,       color: 'bg-slate-500' },
          ].map(k => (
            <Card key={k.label} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className={`p-2 rounded-lg ${k.color} w-fit mb-2`}>
                  <k.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Personal pay card (non-admin / personal view) ── */}
      {view === 'personal' && (() => {
        const cfg = myConfig ?? agents.find(a => a.id === user?.id);

        // No config found
        if (!cfg) return (
          <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-900/10">
            <CardContent className="py-8 text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
              <p className="font-medium text-foreground">No pay configuration found</p>
              <p className="text-sm text-muted-foreground">
                Contact your admin to set up your pay configuration.
              </p>
            </CardContent>
          </Card>
        );

        const r = sorted[0];
        if (!r) return null;

        const pctProgress = Math.min((r.names / r.monthly_quota) * 100, 100);
        const namesToQualify = Math.max(r.base_qualify_names - r.names, 0);
        const namesToFullQuota = Math.max(r.monthly_quota - r.names, 0);

        return (
          <div className="space-y-4">
            {/* ── Top cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Earnings card */}
              <Card className={r.qualified
                ? 'border-green-300 bg-green-50/40 dark:bg-green-900/10'
                : 'border-amber-200 bg-amber-50/30 dark:bg-amber-900/10'}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    {r.qualified
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <AlertCircle  className="h-3.5 w-3.5 text-amber-600" />}
                    {r.qualified ? 'Pay qualified' : 'Not yet qualified'}
                  </div>
                  <p className="text-3xl font-bold text-foreground">{fmt(r.total)}</p>
                  <p className="text-xs text-muted-foreground">Estimated earnings · {format(range.from, 'MMM yyyy')}</p>
                </CardContent>
              </Card>

              {/* Base salary */}
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" /> Base Salary
                </p>
                <p className="text-2xl font-bold">{fmt(r.base)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.qualified
                    ? <span className="text-green-600">✓ Unlocked</span>
                    : <span className="text-amber-600">Need {fmtNum(namesToQualify)} more names to unlock</span>}
                </p>
              </CardContent></Card>

              {/* Commission */}
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Commission
                </p>
                <p className="text-2xl font-bold">{fmt(r.commission)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.qualified
                    ? `${Math.round(r.quotaRatio * 100)}% of ${fmt(r.commission_amount)} max`
                    : 'Unlocks with base salary'}
                </p>
              </CardContent></Card>

              {/* Quota progress */}
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> Quota Progress
                </p>
                <p className="text-2xl font-bold">{fmtNum(r.names)}</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pctProgress}%`,
                      background: pctProgress >= 100 ? '#22c55e' : pctProgress >= 50 ? '#3b82f6' : '#f59e0b',
                    }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pctProgress >= 100
                    ? '🎉 Full quota reached!'
                    : `${fmtNum(namesToFullQuota)} names to full quota (${fmtNum(r.monthly_quota)})`}
                </p>
              </CardContent></Card>
            </div>

            {/* ── Pay calculation breakdown ── */}
            <Card>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setCalcOpen(v => !v)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    How Your Pay Is Calculated
                    {calcOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Based on your {cfg.has_override ? 'custom rate' : 'role default'} configuration
                  </CardDescription>
                </CardHeader>
              </button>
              {calcOpen && (
              <CardContent>
                <div className="space-y-3 text-sm">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.qualified ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>1</div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Qualify for base salary</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Record ≥ {fmtNum(r.base_qualify_names)} names in the month.
                        You have <strong>{fmtNum(r.names)}</strong> names — {r.qualified
                          ? <span className="text-green-600">qualified ✓</span>
                          : <span className="text-amber-600">{fmtNum(namesToQualify)} short</span>}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Base salary:</span>
                        <span className={`font-semibold ${r.base > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>{fmt(r.base_salary)}</span>
                        <span className="text-muted-foreground">→ earned:</span>
                        <span className="font-bold">{fmt(r.base)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-border ml-2.5 pl-5 h-3" />

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.commission > 0 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Earn commission</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Commission = (names ÷ quota) × max commission
                      </p>
                      <div className="mt-1.5 bg-muted/40 rounded-lg p-2.5 text-xs font-mono space-y-0.5">
                        <p>names collected:  <strong>{fmtNum(r.names)}</strong></p>
                        <p>monthly quota:    <strong>{fmtNum(r.monthly_quota)}</strong></p>
                        <p>attainment:       <strong>{Math.round(r.quotaRatio * 100)}%</strong></p>
                        <p>max commission:   <strong>{fmt(r.commission_amount)}</strong></p>
                        <p className="border-t border-border pt-0.5 mt-1">
                          commission earned: <strong className="text-green-700 dark:text-green-400">{fmt(r.commission)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Total estimated pay</span>
                    <span className="text-xl font-bold text-primary">{fmt(r.total)}</span>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* ── 6-month history ── */}
            <Card>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setHistOpen(v => !v)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    My Pay History (Last 6 Months)
                    {histOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current month is an estimate based on names collected so far.
                  </CardDescription>
                </CardHeader>
              </button>
              {histOpen && (
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-xs">Names</TableHead>
                        <TableHead className="text-xs">Quota</TableHead>
                        <TableHead className="text-xs">Attainment</TableHead>
                        <TableHead className="text-xs">Base</TableHead>
                        <TableHead className="text-xs">Commission</TableHead>
                        <TableHead className="text-xs">Total</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyHistory.map((m, i) => (
                        <TableRow key={m.month} className={i === monthlyHistory.length - 1 ? 'bg-primary/5' : ''}>
                          <TableCell className="font-medium text-sm">
                            {m.month}
                            {i === monthlyHistory.length - 1 && (
                              <span className="ml-1.5 text-xs text-primary">(current)</span>
                            )}
                          </TableCell>
                          <TableCell>{fmtNum(m.names)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{fmtNum(m.quota)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 min-w-[60px]">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.min(m.quotaRatio * 100, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(m.quotaRatio * 100)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={m.base > 0 ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-muted-foreground'}>
                            {fmt(m.base)}
                          </TableCell>
                          <TableCell className={m.commission > 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                            {fmt(m.commission)}
                          </TableCell>
                          <TableCell className="font-semibold">{fmt(m.total)}</TableCell>
                          <TableCell>
                            {m.qualified
                              ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Qualified</span>
                              : <span className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" /> Not qualified</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              )}
            </Card>
          </div>
        );
      })()}

      {/* ── Pay breakdown table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {view === 'team' ? 'Team Pay Breakdown' : 'My Pay Breakdown'}
          </CardTitle>
          <CardDescription className="text-xs">
            Sorted by {sortKey} {sortAsc ? '↑' : '↓'} · Click column headers to sort ·
            Field managers show team names (all records they managed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {view === 'personal'
                ? 'No pay configuration found for your account. Contact your admin.'
                : 'No agents found with oralgen capabilities.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {view === 'team' && (
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground text-xs font-medium"
                          onClick={() => toggleSort('name')}>
                          Agent <SortIcon k="name" />
                        </button>
                      </TableHead>
                    )}
                    {view === 'team' && <TableHead className="text-xs">Role</TableHead>}
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground text-xs font-medium"
                        onClick={() => toggleSort('names')}>
                        Names <SortIcon k="names" />
                      </button>
                    </TableHead>
                    <TableHead className="text-xs">Quota</TableHead>
                    <TableHead className="text-xs">Attainment</TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground text-xs font-medium"
                        onClick={() => toggleSort('base')}>
                        Base <SortIcon k="base" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground text-xs font-medium"
                        onClick={() => toggleSort('commission')}>
                        Commission <SortIcon k="commission" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground text-xs font-medium"
                        onClick={() => toggleSort('total')}>
                        Total <SortIcon k="total" />
                      </button>
                    </TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(r => (
                    <TableRow key={r.id}>
                      {view === 'team' && (
                        <TableCell className="font-medium text-sm">
                          {r.full_name || r.id.slice(0,8)+'…'}
                          {r.has_override && (
                            <span className="ml-1.5 text-xs text-primary">★</span>
                          )}
                        </TableCell>
                      )}
                      {view === 'team' && (
                        <TableCell className="text-xs text-muted-foreground">
                          {r.role === 'interviewer' ? 'Field Agent' : 'Field Manager'}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{fmtNum(r.names)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{fmtNum(r.monthly_quota)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(r.quotaRatio * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {Math.round(r.quotaRatio * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={r.base > 0 ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-muted-foreground'}>
                        {fmt(r.base)}
                      </TableCell>
                      <TableCell className={r.commission > 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                        {fmt(r.commission)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{fmt(r.total)}</TableCell>
                      <TableCell>
                        {r.qualified ? (
                          <Badge variant="default" className="text-xs gap-1 py-0 bg-green-600 hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Qualified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1 py-0">
                            <XCircle className="h-3 w-3" />
                            {fmtNum(r.base_qualify_names - r.names)} short
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ★ = custom rates footnote */}
          {view === 'team' && sorted.some(r => r.has_override) && (
            <p className="text-xs text-muted-foreground mt-3">
              ★ Employee has a custom rate override
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

export default OralGenPayroll;
