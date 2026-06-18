import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/supabase-db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Receipt, Wallet, HandCoins, Users,
  TrendingUp, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Request {
  id: string;
  user_id: string;
  kind: string;
  amount: number;
  status: string;
  reason: string;
  category_id: string | null;
  repayment_plan: string | null;
  repaid_count: number;
  approver_note: string;
  decided_at: string | null;
  created_at: string;
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

type SortField = 'created_at' | 'amount' | 'status' | 'kind' | 'employee';
type SortDir = 'asc' | 'desc';

// ─── Summary tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, icon: Icon, tone }: any) {
  const toneClass: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
    green: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600',
    red: 'bg-red-50 dark:bg-red-950/20 text-red-600',
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

// ─── Sort icon helper ─────────────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

// ─── Request History table ────────────────────────────────────────────────────
function RequestHistory({ requests, profiles, categories }: {
  requests: Request[];
  profiles: Record<string, string>;
  categories: Category[];
}) {
  const [search, setSearch]         = useState('');
  const [filterKind, setFilterKind] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth]   = useState('all');
  const [sortField, setSortField]   = useState<SortField>('created_at');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [page, setPage]             = useState(1);

  // Available months from data
  const months = useMemo(() => {
    const set = new Set(requests.map(r => r.created_at.slice(0, 7)));
    return [...set].sort().reverse();
  }, [requests]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'created_at' || field === 'amount' ? 'desc' : 'asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...requests];
    if (filterKind !== 'all') list = list.filter(r => r.kind === filterKind);
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterMonth !== 'all') list = list.filter(r => r.created_at.startsWith(filterMonth));
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
      switch (sortField) {
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'kind': cmp = a.kind.localeCompare(b.kind); break;
        case 'employee': cmp = (profiles[a.user_id] || '').localeCompare(profiles[b.user_id] || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [requests, filterKind, filterStatus, filterMonth, search, sortField, sortDir]);

  // Summary of filtered set
  const summary = useMemo(() => {
    const approved = filtered.filter(r => r.status === 'approved' || r.status === 'repaid').reduce((s, r) => s + r.amount, 0);
    const pending  = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
    const rejected = filtered.filter(r => r.status === 'rejected').reduce((s, r) => s + r.amount, 0);
    return { total: filtered.length, approved, pending, rejected };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ThCell = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(field)}>
      <span className="flex items-center">{label}<SortIcon field={field} sortField={sortField} sortDir={sortDir} /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total requests" value={summary.total} icon={Receipt} tone="blue" />
        <StatTile label="Approved value" value={fmt(summary.approved)} icon={TrendingUp} tone="green" />
        <StatTile label="Pending value" value={fmt(summary.pending)} icon={HandCoins} tone="amber" />
        <StatTile label="Rejected value" value={fmt(summary.rejected)} icon={X} tone="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search employee, reason…" className="pl-8 h-8 text-sm" />
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
        {(filterKind !== 'all' || filterStatus !== 'all' || filterMonth !== 'all' || search) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs" onClick={() => { setFilterKind('all'); setFilterStatus('all'); setFilterMonth('all'); setSearch(''); setPage(1); }}>
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
                <ThCell field="employee" label="Employee" />
                <ThCell field="kind" label="Type" />
                <TableHead>Category</TableHead>
                <ThCell field="amount" label="Amount" />
                <ThCell field="status" label="Status" />
                <ThCell field="created_at" label="Submitted" />
                <TableHead>Decided</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No records match the current filters.</TableCell></TableRow>
              ) : paginated.map(r => {
                const Icon = kindIcon(r.kind);
                const cat = categories.find(c => c.id === r.category_id);
                return (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm">{profiles[r.user_id] || <span className="text-muted-foreground text-xs">{r.user_id.slice(0, 8)}…</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm whitespace-nowrap">{KIND_LABELS[r.kind] || r.kind}</span>
                      </div>
                    </TableCell>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(1)}><ChevronLeft className="h-3 w-3" /><ChevronLeft className="h-3 w-3 -ml-2" /></Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="h-3 w-3" /></Button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const s=Math.max(1,Math.min(page-2,totalPages-4));const p=s+i;return <Button key={p} size="icon" variant={p===page?'default':'outline'} className="h-7 w-7 text-xs" onClick={()=>setPage(p)}>{p}</Button>;})}
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight className="h-3 w-3" /></Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(totalPages)}><ChevronRight className="h-3 w-3" /><ChevronRight className="h-3 w-3 -ml-2" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Monthly Budget Usage table ───────────────────────────────────────────────
function BudgetHistory({ requests, profiles }: {
  requests: Request[];
  profiles: Record<string, string>;
}) {
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterUser,  setFilterUser]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [sortField,   setSortField]   = useState<'month' | 'employee' | 'total' | 'approved' | 'pct'>('month');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [page,        setPage]        = useState(1);

  // Build per-user per-month aggregates from approved/repaid requests
  const rows = useMemo(() => {
    const map: Record<string, {
      month: string; userId: string; total: number; approved: number;
      pending: number; rejected: number; count: number;
    }> = {};

    requests.forEach(r => {
      const month = r.created_at.slice(0, 7);
      const key   = `${month}__${r.user_id}`;
      if (!map[key]) map[key] = { month, userId: r.user_id, total: 0, approved: 0, pending: 0, rejected: 0, count: 0 };
      map[key].total   += r.amount;
      map[key].count   += 1;
      if (r.status === 'approved' || r.status === 'repaid') map[key].approved += r.amount;
      else if (r.status === 'pending') map[key].pending += r.amount;
      else if (r.status === 'rejected') map[key].rejected += r.amount;
    });

    return Object.values(map);
  }, [requests]);

  const months = useMemo(() => [...new Set(rows.map(r => r.month))].sort().reverse(), [rows]);
  const users  = useMemo(() => [...new Set(rows.map(r => r.userId))], [rows]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filterMonth !== 'all') list = list.filter(r => r.month === filterMonth);
    if (filterUser  !== 'all') list = list.filter(r => r.userId === filterUser);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (profiles[r.userId] || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'month':    cmp = a.month.localeCompare(b.month); break;
        case 'employee': cmp = (profiles[a.userId] || '').localeCompare(profiles[b.userId] || ''); break;
        case 'total':    cmp = a.total - b.total; break;
        case 'approved': cmp = a.approved - b.approved; break;
        case 'pct':      cmp = (a.total > 0 ? a.approved / a.total : 0) - (b.total > 0 ? b.approved / b.total : 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, filterMonth, filterUser, search, sortField, sortDir]);

  // Monthly totals summary
  const summary = useMemo(() => {
    const totalRequested = filtered.reduce((s, r) => s + r.total, 0);
    const totalApproved  = filtered.reduce((s, r) => s + r.approved, 0);
    const totalPending   = filtered.reduce((s, r) => s + r.pending, 0);
    const uniqueUsers    = new Set(filtered.map(r => r.userId)).size;
    return { totalRequested, totalApproved, totalPending, uniqueUsers };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const ThCell = ({ field, label }: { field: typeof sortField; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(field)}>
      <span className="flex items-center">{label}
        {sortField === field ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />) : <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total requested" value={fmt(summary.totalRequested)} icon={Wallet} tone="blue" sub={`${filtered.length} entries`} />
        <StatTile label="Total approved" value={fmt(summary.totalApproved)} icon={TrendingUp} tone="green" />
        <StatTile label="Total pending" value={fmt(summary.totalPending)} icon={HandCoins} tone="amber" />
        <StatTile label="Employees tracked" value={summary.uniqueUsers} icon={Users} tone="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search employee…" className="pl-8 h-8 text-sm" />
          {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <Select value={filterMonth} onValueChange={v => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All months" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={v => { setFilterUser(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {users.map(uid => <SelectItem key={uid} value={uid}>{profiles[uid] || uid.slice(0,8)+'…'}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterMonth !== 'all' || filterUser !== 'all' || search) && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs" onClick={() => { setFilterMonth('all'); setFilterUser('all'); setSearch(''); setPage(1); }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} row{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <ThCell field="month"    label="Month" />
                <ThCell field="employee" label="Employee" />
                <TableHead className="text-right">Requests</TableHead>
                <ThCell field="total"    label="Total Requested" />
                <ThCell field="approved" label="Approved" />
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <ThCell field="pct"      label="Approval Rate" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No budget history found.</TableCell></TableRow>
              ) : paginated.map((r, i) => {
                const rate = r.total > 0 ? Math.round((r.approved / r.total) * 100) : 0;
                const rateColor = rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500';
                return (
                  <TableRow key={`${r.month}_${r.userId}_${i}`} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm whitespace-nowrap">{format(new Date(r.month + '-01'), 'MMM yyyy')}</TableCell>
                    <TableCell className="text-sm">{profiles[r.userId] || <span className="text-muted-foreground text-xs">{r.userId.slice(0,8)}…</span>}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.count}</TableCell>
                    <TableCell className="text-right font-semibold text-sm whitespace-nowrap">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 font-medium whitespace-nowrap">{fmt(r.approved)}</TableCell>
                    <TableCell className="text-right text-sm text-amber-600 whitespace-nowrap">{fmt(r.pending)}</TableCell>
                    <TableCell className="text-right text-sm text-red-500 whitespace-nowrap">{fmt(r.rejected)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-semibold ${rateColor}`}>{rate}%</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(1)}><ChevronLeft className="h-3 w-3" /><ChevronLeft className="h-3 w-3 -ml-2" /></Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="h-3 w-3" /></Button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const s=Math.max(1,Math.min(page-2,totalPages-4));const p=s+i;return <Button key={p} size="icon" variant={p===page?'default':'outline'} className="h-7 w-7 text-xs" onClick={()=>setPage(p)}>{p}</Button>;})}
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight className="h-3 w-3" /></Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(totalPages)}><ChevronRight className="h-3 w-3" /><ChevronRight className="h-3 w-3 -ml-2" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function FinanceHistory() {
  const { data: allRequests = [] } = useQuery({
    queryKey: ['finance_history_all_requests'],
    queryFn: async () => {
      const { data, error } = await db
        .from('advance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Request[];
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
          Complete audit trail of all finance requests and monthly budget usage per employee.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="requests">
          <TabsList className="mb-4">
            <TabsTrigger value="requests" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Request History
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Monthly Budget Usage
            </TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <RequestHistory requests={allRequests} profiles={profiles} categories={categoryList} />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetHistory requests={allRequests} profiles={profiles} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
