import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/supabase-db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Receipt, Wallet, HandCoins, Users,
  TrendingUp, X, AlertTriangle, CheckCircle2, ShieldAlert,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Request {
  id: string; user_id: string; kind: string; amount: number; status: string;
  reason: string; category_id: string | null; repayment_plan: string | null;
  repaid_count: number; approver_note: string; decided_at: string | null; created_at: string;
}
interface Budget {
  id: string; scope_type: string; scope_id: string;
  kinds: string[]; kind: string;
  category_ids: string[]; category_id: string | null;
  monthly_limit: number;
}
interface Profile { id: string; full_name: string | null; }
interface Category { id: string; name: string; kind: string; }

const PAGE_SIZE = 20;

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

const KIND_LABELS: Record<string, string> = {
  salary_advance: 'Salary Advance',
  reimbursement: 'Reimbursement',
  cash_advance: 'Cash Advance',
};

const statusVariant = (s: string): any =>
  s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'repaid' ? 'secondary' : 'outline';

const kindIcon = (kind: string) => {
  if (kind === 'salary_advance') return HandCoins;
  if (kind === 'reimbursement') return Receipt;
  return Wallet;
};

type SortDir = 'asc' | 'desc';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function StatTile({ label, value, sub, icon: Icon, tone }: any) {
  const toneClass: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    green:  'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600',
    amber:  'bg-amber-50 dark:bg-amber-950/20 text-amber-600',
    red:    'bg-red-50 dark:bg-red-950/20 text-red-600',
    purple: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600',
  };
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${toneClass[tone] || toneClass.blue}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

function PaginationBar({ page, totalPages, total, onChange }: {
  page: number; totalPages: number; total: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <p className="text-xs text-muted-foreground">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(1)}>
          <ChevronLeft className="h-3 w-3" /><ChevronLeft className="h-3 w-3 -ml-2" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const p = start + i;
          return <Button key={p} size="icon" variant={p === page ? 'default' : 'outline'} className="h-7 w-7 text-xs" onClick={() => onChange(p)}>{p}</Button>;
        })}
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(totalPages)}>
          <ChevronRight className="h-3 w-3" /><ChevronRight className="h-3 w-3 -ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─── Request History ──────────────────────────────────────────────────────────
function RequestHistory({ requests, profiles, categories }: {
  requests: Request[]; profiles: Record<string, string>; categories: Category[];
}) {
  const [search, setSearch]             = useState('');
  const [filterKind, setFilterKind]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth]   = useState('all');
  const [sortField, setSortField]       = useState<'created_at'|'amount'|'status'|'kind'|'employee'>('created_at');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [page, setPage]                 = useState(1);

  const months = useMemo(() =>
    [...new Set(requests.map(r => r.created_at.slice(0, 7)))].sort().reverse(), [requests]);

  const handleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir(f === 'created_at' || f === 'amount' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...requests];
    if (filterKind !== 'all')   list = list.filter(r => r.kind === filterKind);
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterMonth !== 'all')  list = list.filter(r => r.created_at.startsWith(filterMonth));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (profiles[r.user_id] || '').toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        KIND_LABELS[r.kind]?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'kind')   cmp = a.kind.localeCompare(b.kind);
      else if (sortField === 'employee') cmp = (profiles[a.user_id] || '').localeCompare(profiles[b.user_id] || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [requests, filterKind, filterStatus, filterMonth, search, sortField, sortDir]);

  const summary = useMemo(() => {
    const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
    const approved    = filtered.filter(r => r.status === 'approved' || r.status === 'repaid').reduce((s, r) => s + r.amount, 0);
    const pending     = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
    const rejected    = filtered.filter(r => r.status === 'rejected').reduce((s, r) => s + r.amount, 0);
    return { total: filtered.length, totalAmount, approved, pending, rejected };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clearActive = filterKind !== 'all' || filterStatus !== 'all' || filterMonth !== 'all' || !!search;

  const Th = ({ f, label }: { f: typeof sortField; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(f)}>
      <span className="flex items-center">{label}<SortArrow active={sortField === f} dir={sortDir} /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Summary tiles — total count + total amount in sub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Total requests"
          value={`${summary.total} (${fmt(summary.totalAmount)})`}
          icon={Receipt} tone="blue"
        />
        <StatTile label="Approved value"  value={fmt(summary.approved)} icon={TrendingUp} tone="green" />
        <StatTile label="Pending value"   value={fmt(summary.pending)}  icon={HandCoins}  tone="amber" />
        <StatTile label="Rejected value"  value={fmt(summary.rejected)} icon={X}          tone="red"   />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search employee, reason…" className="pl-8 h-8 text-sm" />
          {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
        </div>
        <Select value={filterKind} onValueChange={v => { setFilterKind(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="salary_advance">Salary Advance</SelectItem>
            <SelectItem value="reimbursement">Reimbursement</SelectItem>
            <SelectItem value="cash_advance">Cash Advance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="repaid">Repaid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={v => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All months" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</SelectItem>)}
          </SelectContent>
        </Select>
        {clearActive && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs"
            onClick={() => { setFilterKind('all'); setFilterStatus('all'); setFilterMonth('all'); setSearch(''); setPage(1); }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <Th f="employee"   label="Employee" />
                <Th f="kind"       label="Type" />
                <TableHead>Category</TableHead>
                <Th f="amount"     label="Amount" />
                <Th f="status"     label="Status" />
                <Th f="created_at" label="Submitted" />
                <TableHead>Decided</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No records match the current filters.</TableCell></TableRow>
              ) : paginated.map(r => {
                const Icon = kindIcon(r.kind);
                const cat  = categories.find(c => c.id === r.category_id);
                return (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm">{profiles[r.user_id] || <span className="text-muted-foreground text-xs">{r.user_id.slice(0, 8)}…</span>}</TableCell>
                    <TableCell><div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="text-sm whitespace-nowrap">{KIND_LABELS[r.kind] || r.kind}</span></div></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cat?.name || '—'}</TableCell>
                    <TableCell className="font-semibold text-sm whitespace-nowrap">{fmt(r.amount)}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)} className="capitalize text-xs">{r.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.decided_at ? format(new Date(r.decided_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={r.approver_note}>{r.approver_note || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={filtered.length} onChange={setPage} />
    </div>
  );
}

// ─── Budget Allocation & Spending ────────────────────────────────────────────
// Shows each user-scoped budget from finance_budgets, their monthly_limit,
// and how much they actually spent (approved requests) in the selected month.
function BudgetAllocationHistory({ requests, budgets, profiles, categories }: {
  requests: Request[]; budgets: Budget[];
  profiles: Record<string, string>; categories: Category[];
}) {
  // Default to current month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth]   = useState(thisMonth);
  const [filterUser,  setFilterUser]    = useState('all');
  const [filterKind,  setFilterKind]    = useState('all');
  const [search,      setSearch]        = useState('');
  const [sortField,   setSortField]     = useState<BudSortField>('employee');
  const [sortDir,     setSortDir]       = useState<SortDir>('asc');
  const [page,        setPage]          = useState(1);

  type BudSortField = 'employee' | 'kind' | 'limit' | 'spent' | 'remaining' | 'pct';

  // All months that have requests (for filter dropdown)
  const months = useMemo(() =>
    [...new Set(requests.map(r => r.created_at.slice(0, 7)))].sort().reverse(), [requests]);

  // Approved spending for the selected month, keyed by user_id + kind
  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    requests
      .filter(r => r.created_at.startsWith(filterMonth) && (r.status === 'approved' || r.status === 'repaid'))
      .forEach(r => {
        const key = `${r.user_id}__${r.kind}`;
        map[key] = (map[key] || 0) + r.amount;
      });
    return map;
  }, [requests, filterMonth]);

  // Build rows from user-scoped budgets
  const rows = useMemo(() => {
    return budgets
      .filter(b => b.scope_type === 'user')
      .flatMap(b => {
        // A budget may cover multiple kinds
        const kinds = Array.isArray(b.kinds) && b.kinds.length > 0
          ? b.kinds
          : b.kind ? [b.kind] : [];
        return kinds.map(kind => {
          const spent     = spendingMap[`${b.scope_id}__${kind}`] || 0;
          const limit     = Number(b.monthly_limit) || 0;
          const remaining = Math.max(0, limit - spent);
          const pct       = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const overBudget = spent > limit;
          return {
            budgetId: b.id,
            userId:   b.scope_id,
            kind,
            limit,
            spent,
            remaining,
            pct,
            overBudget,
          };
        });
      });
  }, [budgets, spendingMap]);

  const handleSort = (f: BudSortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir(f === 'limit' || f === 'spent' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filterUser !== 'all') list = list.filter(r => r.userId === filterUser);
    if (filterKind !== 'all') list = list.filter(r => r.kind === filterKind);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (profiles[r.userId] || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'employee')  cmp = (profiles[a.userId] || '').localeCompare(profiles[b.userId] || '');
      else if (sortField === 'kind') cmp = a.kind.localeCompare(b.kind);
      else if (sortField === 'limit')     cmp = a.limit - b.limit;
      else if (sortField === 'spent')     cmp = a.spent - b.spent;
      else if (sortField === 'remaining') cmp = a.remaining - b.remaining;
      else if (sortField === 'pct')       cmp = a.pct - b.pct;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, filterUser, filterKind, search, sortField, sortDir]);

  // Summary stats for the current filtered view
  const summary = useMemo(() => {
    const totalAllocated = filtered.reduce((s, r) => s + r.limit, 0);
    const totalSpent     = filtered.reduce((s, r) => s + r.spent, 0);
    const totalRemaining = filtered.reduce((s, r) => s + r.remaining, 0);
    const overCount      = filtered.filter(r => r.overBudget).length;
    return { totalAllocated, totalSpent, totalRemaining, overCount };
  }, [filtered]);

  const userIds     = useMemo(() => [...new Set(rows.map(r => r.userId))], [rows]);
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clearActive = filterUser !== 'all' || filterKind !== 'all' || !!search;

  const Th = ({ f, label }: { f: BudSortField; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(f)}>
      <span className="flex items-center">{label}<SortArrow active={sortField === f} dir={sortDir} /></span>
    </TableHead>
  );

  return (
    <TooltipProvider>
    <div className="space-y-4">

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total allocated" value={fmt(summary.totalAllocated)} icon={Wallet}       tone="blue"   sub={`${filtered.length} budget line${filtered.length !== 1 ? 's' : ''}`} />
        <StatTile label="Total spent"     value={fmt(summary.totalSpent)}     icon={TrendingUp}   tone="green"  sub={summary.totalAllocated > 0 ? `${Math.round((summary.totalSpent / summary.totalAllocated) * 100)}% of allocation` : undefined} />
        <StatTile label="Remaining"       value={fmt(summary.totalRemaining)} icon={HandCoins}    tone="amber"  />
        <StatTile label="Over budget"     value={summary.overCount}           icon={ShieldAlert}  tone={summary.overCount > 0 ? 'red' : 'green'} sub={summary.overCount > 0 ? 'lines exceeded limit' : 'All within limits'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Month selector — prominent since it's the primary dimension */}
        <Select value={filterMonth} onValueChange={v => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-8 text-sm font-medium border-primary/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={thisMonth}>{format(new Date(thisMonth + '-01'), 'MMMM yyyy')} (Current)</SelectItem>
            {months.filter(m => m !== thisMonth).map(m => (
              <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</SelectItem>
            ))}
            {!months.includes(thisMonth) && months.length === 0 && (
              <SelectItem value={thisMonth}>{format(new Date(thisMonth + '-01'), 'MMMM yyyy')}</SelectItem>
            )}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search employee…" className="pl-8 h-8 text-sm" />
          {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
        </div>

        <Select value={filterUser} onValueChange={v => { setFilterUser(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {userIds.map(uid => (
              <SelectItem key={uid} value={uid}>{profiles[uid] || uid.slice(0, 8) + '…'}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterKind} onValueChange={v => { setFilterKind(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="salary_advance">Salary Advance</SelectItem>
            <SelectItem value="reimbursement">Reimbursement</SelectItem>
            <SelectItem value="cash_advance">Cash Advance</SelectItem>
          </SelectContent>
        </Select>

        {clearActive && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs"
            onClick={() => { setFilterUser('all'); setFilterKind('all'); setSearch(''); setPage(1); }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} line{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <Th f="employee"  label="Employee" />
                <Th f="kind"      label="Budget Type" />
                <Th f="limit"     label="Monthly Limit" />
                <Th f="spent"     label="Spent (Approved)" />
                <Th f="remaining" label="Remaining" />
                <Th f="pct"       label="Usage %" />
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    {rows.length === 0
                      ? 'No user budget allocations found. Assign budgets in the Settings tab.'
                      : 'No budget lines match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : paginated.map((r, i) => {
                const Icon = kindIcon(r.kind);
                const pctRounded = Math.round(r.pct);
                const barColor = r.overBudget
                  ? 'bg-destructive'
                  : r.pct >= 80 ? 'bg-amber-500'
                  : 'bg-emerald-500';
                return (
                  <TableRow key={`${r.budgetId}_${r.kind}_${i}`} className={r.overBudget ? 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/60' : 'hover:bg-muted/20'}>
                    <TableCell className="font-medium text-sm">
                      {profiles[r.userId] || <span className="text-muted-foreground text-xs">{r.userId.slice(0, 8)}…</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm whitespace-nowrap">{KIND_LABELS[r.kind] || r.kind}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold whitespace-nowrap">{fmt(r.limit)}</TableCell>
                    <TableCell className={`text-sm font-semibold whitespace-nowrap ${r.overBudget ? 'text-destructive' : 'text-foreground'}`}>
                      <div className="flex items-center gap-1">
                        {r.overBudget && (
                          <Tooltip>
                            <TooltipTrigger><AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" /></TooltipTrigger>
                            <TooltipContent>Over budget by {fmt(r.spent - r.limit)}</TooltipContent>
                          </Tooltip>
                        )}
                        {fmt(r.spent)}
                      </div>
                    </TableCell>
                    <TableCell className={`text-sm whitespace-nowrap ${r.remaining === 0 ? 'text-muted-foreground' : 'text-emerald-600 font-medium'}`}>
                      {r.overBudget ? <span className="text-destructive font-medium">−{fmt(r.spent - r.limit)}</span> : fmt(r.remaining)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold whitespace-nowrap">
                      <span className={r.overBudget ? 'text-destructive' : r.pct >= 80 ? 'text-amber-600' : 'text-emerald-600'}>
                        {pctRounded}%
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="space-y-1">
                        <Progress value={Math.min(100, r.pct)} className="h-2" />
                        {r.overBudget && (
                          <p className="text-[10px] text-destructive font-medium">Exceeded by {fmt(r.spent - r.limit)}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={filtered.length} onChange={setPage} />
    </div>
    </TooltipProvider>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function FinanceHistory() {
  const { data: allRequests = [] } = useQuery({
    queryKey: ['finance_history_all_requests'],
    queryFn: async () => {
      const { data, error } = await db.from('advance_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Request[];
    },
  });

  const { data: allBudgets = [] } = useQuery({
    queryKey: ['finance_history_budgets'],
    queryFn: async () => {
      const { data, error } = await db.from('finance_budgets').select('*');
      if (error) throw error;
      return (data || []) as Budget[];
    },
  });

  const { data: profileList = [] } = useQuery({
    queryKey: ['finance_history_profiles'],
    queryFn: async () => {
      const { data, error } = await db.from('profiles').select('id, full_name');
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });

  const { data: categoryList = [] } = useQuery({
    queryKey: ['finance_history_categories'],
    queryFn: async () => {
      const { data, error } = await db.from('finance_categories').select('id, name, kind');
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const profiles: Record<string, string> = {};
  profileList.forEach(p => { profiles[p.id] = p.full_name || ''; });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Finance History
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Full audit trail of all finance requests and monthly budget allocation vs spending per employee.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="requests">
          <TabsList className="mb-4">
            <TabsTrigger value="requests" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Request History
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Budget vs Spending
            </TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <RequestHistory
              requests={allRequests}
              profiles={profiles}
              categories={categoryList}
            />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetAllocationHistory
              requests={allRequests}
              budgets={allBudgets}
              profiles={profiles}
              categories={categoryList}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
