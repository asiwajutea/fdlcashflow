import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAdvanceRequests, useFinanceCategories, useFinanceBudgets, AdvanceKind } from '@/hooks/useAdvanceRequests';
import { useMyFinanceLedger } from '@/hooks/useMyFinanceLedger';
import { useMyBudgets } from '@/hooks/useMyBudgets';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Wallet, TrendingUp, TrendingDown, HandCoins, Plus, Check, X, AlertCircle, Edit, Trash2, Receipt, Loader2, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ExportMenu } from '@/components/finance/ExportMenu';
import { RequestTimeline } from '@/components/finance/RequestTimeline';
import { FinanceHistory } from '@/components/finance/FinanceHistory';
import { Alert, AlertDescription } from '@/components/ui/alert';

const COLORS = ['#0B1F3B', '#FF7A00', '#10b981', '#8b5cf6', '#ef4444'];
const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

const kindLabel: Record<AdvanceKind, string> = {
  salary_advance: 'Salary Advance',
  reimbursement: 'Reimbursement',
  cash_advance: 'Cash Advance',
};
const statusVariant = (s: string): any =>
  s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'repaid' ? 'secondary' : 'outline';

// Payment progress of a salary advance request, derived from repaid installments.
type AdvancePayStatus = 'not_paid' | 'partially_paid' | 'fully_paid';
const payStatusLabel: Record<AdvancePayStatus, string> = {
  not_paid: 'Not Paid',
  partially_paid: 'Partially Paid',
  fully_paid: 'Fully Paid',
};
const payStatusVariant = (s: AdvancePayStatus): any =>
  s === 'fully_paid' ? 'default' : s === 'partially_paid' ? 'secondary' : 'outline';
const payStatusTone: Record<AdvancePayStatus, string> = {
  not_paid: 'text-destructive',
  partially_paid: 'text-orange-600',
  fully_paid: 'text-emerald-600',
};

// Derives how much of a salary advance has been repaid. Prefers the real sum of
// `advance_repayments` rows (which the InvoiceGenerator also writes when auto-deducting,
// and which admins can adjust manually). Falls back to the installment estimate from
// `repaid_count` when no repayment rows exist for the advance.
const deriveAdvancePayment = (r: any, paidFromRepayments?: number) => {
  const installments = r.repayment_plan === 'two' ? 2 : 1;
  const total = Number(r.amount || 0);
  let paidAmount: number;
  if (paidFromRepayments !== undefined && paidFromRepayments !== null) {
    paidAmount = paidFromRepayments;
  } else {
    const repaid = Math.min(Number(r.repaid_count || 0), installments);
    paidAmount = installments > 0 ? (total * repaid) / installments : 0;
  }
  paidAmount = Math.max(0, Math.min(total, paidAmount));
  const outstanding = Math.max(0, total - paidAmount);
  const eps = 0.005;
  let payStatus: AdvancePayStatus;
  if (r.status === 'repaid' || (total > 0 && paidAmount >= total - eps)) payStatus = 'fully_paid';
  else if (paidAmount > eps) payStatus = 'partially_paid';
  else payStatus = 'not_paid';
  return { installments, total, paidAmount, outstanding, payStatus };
};

// Opens a private "documents" bucket file in a new tab via a short-lived signed URL.
const openReceipt = async (path: string) => {
  if (!path) return;
  if (/^https?:\/\//.test(path)) { window.open(path, '_blank', 'noopener'); return; }
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast({ title: 'Could not open document', description: error?.message ?? 'File unavailable', variant: 'destructive' });
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener');
};

export default function Finance() {
  const { user, role, capabilities, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin';
  const isSuperAdmin = false;
  const isSystemAdmin = isAdmin || isSuperAdmin;
  
  const canApprove = isSystemAdmin || capabilities.includes('approve_finance_requests');
  const canManageBudgets = isSystemAdmin || capabilities.includes('manage_finance_budgets');

  const qc = useQueryClient();

  // Personal user-scoped queries
  const { data: ledger } = useMyFinanceLedger(user?.id ?? null, user?.email ?? null);
  const { data: myBudgets = [] } = useMyBudgets(user?.id ?? null);
  const { requests: myRequests, create, remove, decide } = useAdvanceRequests({ userId: user?.id ?? null });
  
  // Platform settings configurations
  const { categories } = useFinanceCategories();
  const { budgets } = useFinanceBudgets();

  // Fix: Direct global fetch for all advance requests when user is an admin
  const { data: allRequestsAdmin = [] } = useQuery({
    queryKey: ['global_platform_advance_requests'],
    queryFn: async () => {
      const { data, error } = await db.from('advance_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isSystemAdmin,
  });

  // Direct global fetch for ALL employees' salary invoices when user is an admin / super admin.
  // Salary data lives in the `invoices` table (net_payment, total_deductions, etc.), not `payslips`.
  // Admins can read every employee's invoices via RLS, so this aggregates platform-wide totals
  // rather than the admin's own personal salary.
  const { data: allPayslipsAdmin = [] } = useQuery({
    queryKey: ['global_platform_invoices'],
    queryFn: async () => {
      const { data, error } = await db.from('invoices').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: isSystemAdmin,
  });

  // Map of user_id -> display name, used to label whose salary advance is whose in the
  // platform-wide admin accumulation view. Employees never need this (they only see self).
  const { data: profileNameMap = {} } = useQuery({
    queryKey: ['finance_profile_names'],
    queryFn: async () => {
      const { data, error } = await db.from('profiles').select('id, full_name');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || ''; });
      return map;
    },
    enabled: isSystemAdmin,
  });

  // Actual amounts repaid per advance, summed from `advance_repayments`. RLS scopes this
  // automatically: employees only get their own advances' repayments, admins get all.
  const { data: repaymentRows = [] } = useQuery({
    queryKey: ['advance_repayments_overview'],
    queryFn: async () => {
      const { data, error } = await db.from('advance_repayments').select('advance_id, amount');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
  const repaidByAdvance = useMemo(() => {
    const m: Record<string, number> = {};
    (repaymentRows as any[]).forEach((r) => { m[r.advance_id] = (m[r.advance_id] || 0) + Number(r.amount || 0); });
    return m;
  }, [repaymentRows]);

  // Admin-only: update a salary advance's payment status / amount repaid.
  // The amount repaid is the source of truth (recorded as an adjusting advance_repayments
  // row); status + repaid_count are kept in sync so the rest of the app stays consistent.
  const [editAdvance, setEditAdvance] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<AdvancePayStatus>('not_paid');
  const [editPaid, setEditPaid] = useState('');

  const updateAdvancePayment = useMutation({
    mutationFn: async ({ advance, status, paidInput }: { advance: any; status: AdvancePayStatus; paidInput: string }) => {
      const total = Number(advance.total || 0);
      const installments = advance.installments || 1;
      const currentPaid = Number(advance.paidAmount || 0);

      let target: number;
      if (status === 'fully_paid') target = total;
      else if (status === 'not_paid') target = 0;
      else target = Number(paidInput || 0);

      if (!Number.isFinite(target) || target < 0) throw new Error('Enter a valid amount');
      target = Math.max(0, Math.min(total, target));

      // Normalise status to match the resulting amount.
      const finalStatus: AdvancePayStatus = target >= total - 0.005 ? 'fully_paid' : target <= 0.005 ? 'not_paid' : 'partially_paid';

      const delta = Math.round((target - currentPaid) * 100) / 100;
      if (Math.abs(delta) > 0.005) {
        const { error: insErr } = await db.from('advance_repayments').insert({ advance_id: advance.id, invoice_id: null, amount: delta });
        if (insErr) throw insErr;
      }

      const repaid_count = finalStatus === 'fully_paid' ? installments : finalStatus === 'not_paid' ? 0 : (installments === 2 ? 1 : 0);
      const newStatus = finalStatus === 'fully_paid' ? 'repaid' : 'approved';
      const { error: updErr } = await db.from('advance_requests').update({ repaid_count, status: newStatus }).eq('id', advance.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      toast({ title: 'Payment status updated' });
      qc.invalidateQueries({ queryKey: ['advance_repayments_overview'] });
      qc.invalidateQueries({ queryKey: ['global_platform_advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      setEditAdvance(null);
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  // Subordinate mapping
  const { data: subordinateIds = [] } = useQuery({
    queryKey: ['subordinate_ids', user?.id],
    queryFn: async () => {
      const { data, error } = await db.rpc('get_my_subordinates');
      if (error) return [];
      return (data as any[]).map(r => r.user_id);
    },
    enabled: !!user,
  });
  const isLeader = subordinateIds.length > 0;

  // Time period filter configuration
  type Period = 'week' | 'month' | 'quarter' | 'year' | 'lifetime' | 'custom';
  const [period, setPeriod] = useState<Period>('lifetime');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  // Salary advance payment-status filter (works alongside the period filter)
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<'all' | AdvancePayStatus>('all');
  
  const periodRange = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    const start = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: start(d), to: now }; }
    if (period === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start(d), to: now }; }
    if (period === 'quarter') { const q = Math.floor(now.getMonth() / 3); const d = new Date(now.getFullYear(), q * 3, 1); return { from: start(d), to: now }; }
    if (period === 'year') { const d = new Date(now.getFullYear(), 0, 1); return { from: start(d), to: now }; }
    if (period === 'custom') return { from: customFrom ? start(customFrom) : null, to: customTo ?? null };
    return { from: null, to: null };
  }, [period, customFrom, customTo]);

  const inRange = (iso?: string | null) => {
    if (!periodRange.from && !periodRange.to) return true;
    if (!iso) return false;
    const d = new Date(iso);
    if (periodRange.from && d < periodRange.from) return false;
    if (periodRange.to && d > periodRange.to) return false;
    return true;
  };

  // Bind accurate target source variables depending on context role
  const requestsToProcess = isSystemAdmin ? allRequestsAdmin : myRequests;
  const payslipsToProcess = isSystemAdmin ? allPayslipsAdmin : (ledger?.payslips || []);

  const filteredRequests = useMemo(() => requestsToProcess.filter((r: any) => inRange(r.created_at)), [requestsToProcess, periodRange]);
  const filteredPayslips = useMemo(() => payslipsToProcess.filter((p: any) => {
    const iso = p.date_issued || (p.year && p.month ? `${p.year}-${String(p.month).padStart(2,'0')}-01` : null);
    return inRange(iso);
  }), [payslipsToProcess, periodRange]);

  // Robust field metric computation using clean generic fallbacks
  const summary = useMemo(() => {
    const salaryPaid = filteredPayslips.reduce((s: number, p: any) => s + Number(p.net_payment ?? p.net_pay ?? p.net_amount ?? p.amount ?? 0), 0);
    const totalDeductions = filteredPayslips.reduce((s: number, p: any) => s + Number(p.total_deductions ?? p.deductions ?? 0), 0);
    
    const outstandingAdvances = filteredRequests
      .filter((r: any) => (r.status === 'approved' || r.status === 'pending') && (r.kind === 'salary_advance' || r.kind === 'cash_advance'))
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      
    const reimbursedYtd = filteredRequests
      .filter((r: any) => r.status === 'approved' && r.kind === 'reimbursement')
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      
    const cashAdvanceYtd = filteredRequests
      .filter((r: any) => r.status === 'approved' && r.kind === 'cash_advance')
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      
    return { 
      salaryPaid, 
      expensesTotal: totalDeductions, 
      outstandingAdvances, 
      reimbursedYtd, 
      cashAdvanceYtd, 
      net: salaryPaid - totalDeductions 
    };
  }, [filteredPayslips, filteredRequests]);

  // Salary advance tracking: only show approved/repaid advances in the admin
  // accumulation view. Pending requests are excluded — admin should only track
  // amounts that have actually been approved and disbursed.
  const salaryAdvances = useMemo(() => {
    return filteredRequests
      .filter((r: any) => r.kind === 'salary_advance' && (r.status === 'approved' || r.status === 'repaid'))
      .map((r: any) => ({ ...r, ...deriveAdvancePayment(r, repaidByAdvance[r.id]) }))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filteredRequests, repaidByAdvance]);

  const advanceStatusSummary = useMemo(() => {
    const base: Record<AdvancePayStatus | 'all', { count: number; amount: number; paid: number; outstanding: number }> = {
      not_paid: { count: 0, amount: 0, paid: 0, outstanding: 0 },
      partially_paid: { count: 0, amount: 0, paid: 0, outstanding: 0 },
      fully_paid: { count: 0, amount: 0, paid: 0, outstanding: 0 },
      all: { count: 0, amount: 0, paid: 0, outstanding: 0 },
    };
    salaryAdvances.forEach((r: any) => {
      const bucket = base[r.payStatus as AdvancePayStatus];
      bucket.count += 1;
      bucket.amount += r.total;
      bucket.paid += r.paidAmount;
      bucket.outstanding += r.outstanding;
      base.all.count += 1;
      base.all.amount += r.total;
      base.all.paid += r.paidAmount;
      base.all.outstanding += r.outstanding;
    });
    return base;
  }, [salaryAdvances]);

  const visibleAdvances = useMemo(
    () => (advanceStatusFilter === 'all' ? salaryAdvances : salaryAdvances.filter((r: any) => r.payStatus === advanceStatusFilter)),
    [salaryAdvances, advanceStatusFilter]
  );

  // Dynamic monthly aggregation logic
  const monthlyData = useMemo(() => {
    if (!isSystemAdmin) return ledger?.monthly || [];
    
    const monthsMap: Record<string, { month: string, income: number, expense: number }> = {};
    
    filteredPayslips.forEach((p: any) => {
      let monthStr = '';
      if (p.date_issued) {
        monthStr = format(new Date(p.date_issued), 'MMM yyyy');
      } else if (p.year && p.month) {
        monthStr = format(new Date(p.year, p.month - 1, 1), 'MMM yyyy');
      }
      if (!monthStr) return;
      if (!monthsMap[monthStr]) monthsMap[monthStr] = { month: monthStr, income: 0, expense: 0 };
      monthsMap[monthStr].income += Number(p.net_payment ?? p.net_pay ?? p.net_amount ?? p.amount ?? 0);
    });

    filteredRequests.forEach((r: any) => {
      if (r.status !== 'approved') return;
      const monthStr = format(new Date(r.created_at), 'MMM yyyy');
      if (!monthsMap[monthStr]) monthsMap[monthStr] = { month: monthStr, income: 0, expense: 0 };
      monthsMap[monthStr].expense += Number(r.amount || 0);
    });

    return Object.values(monthsMap).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [isSystemAdmin, ledger, filteredPayslips, filteredRequests]);

  const categoryBreakdown = useMemo(() => {
    const byKind: Record<string, number> = { 'Salary Payment': 0, 'Salary Advance': 0, 'Reimbursement': 0, 'Cash Advance': 0 };
    byKind['Salary Payment'] = summary.salaryPaid;
    filteredRequests.filter((r: any) => r.status === 'approved').forEach((r: any) => {
      if (kindLabel[r.kind as AdvanceKind]) {
        byKind[kindLabel[r.kind as AdvanceKind]] += Number(r.amount || 0);
      }
    });
    return Object.entries(byKind).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filteredRequests, summary]);

  // Comprehensive active platform budget analysis limits
  const compiledBudgetsToDisplay = useMemo(() => {
    if (!isSystemAdmin) {
      return myBudgets.map(mb => ({
        id: mb.budget.id,
        kindNames: (Array.isArray(mb.budget.kinds) ? mb.budget.kinds : [mb.budget.kind]).map((k: any) => kindLabel[k as AdvanceKind] || k).join(', '),
        catNames: (Array.isArray(mb.budget.category_ids) ? mb.budget.category_ids : [mb.budget.category_id]).map((id: any) => categories.find((c: any) => c.id === id)?.name).filter(Boolean).join(', '),
        limit: Number(mb.budget.monthly_limit),
        used: mb.used,
        remaining: mb.remaining,
        pct: mb.pct,
        metaText: `${mb.budget.scope_type} budget`
      }));
    }

    return budgets.map((b: any) => {
      const kinds = Array.isArray(b.kinds) && b.kinds.length > 0 ? b.kinds : (b.kind ? [b.kind] : []);
      const catIds = Array.isArray(b.category_ids) && b.category_ids.length > 0 ? b.category_ids : (b.category_id ? [b.category_id] : []);
      
      const now = new Date();
      const thisMonthRequests = allRequestsAdmin.filter((r: any) => {
        if (r.status !== 'approved') return false;
        const rDate = new Date(r.created_at);
        if (rDate.getFullYear() !== now.getFullYear() || rDate.getMonth() !== now.getMonth()) return false;
        if (b.scope_type === 'user' && r.user_id !== b.scope_id) return false;
        if (!kinds.includes(r.kind)) return false;
        if (catIds.length > 0 && !catIds.includes(r.category_id)) return false;
        return true;
      });

      const used = thisMonthRequests.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      const limit = Number(b.monthly_limit || 0);
      const remaining = Math.max(0, limit - used);
      const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
      const kindNames = kinds.map((k: any) => kindLabel[k as AdvanceKind] || k).join(', ');
      const catNames = catIds.map((id: any) => categories.find((c: any) => c.id === id)?.name).filter(Boolean).join(', ');

      return {
        id: b.id,
        kindNames,
        catNames: catNames ? ` · ${catNames}` : '',
        limit,
        used,
        remaining,
        pct,
        metaText: (() => {
          if (b.scope_type === 'user') {
            const name = profileNameMap[b.scope_id] || b.scope_id;
            return `User Limit · ${name}`;
          }
          if (b.scope_type === 'role') return `Role Limit · ${b.scope_id || 'All'}`;
          if (b.scope_type === 'department') return `Department Limit · ${b.scope_id || 'All'}`;
          return `Limit Spec (${b.scope_id || 'Global'})`;
        })()
      };
    });
  }, [isSystemAdmin, myBudgets, budgets, allRequestsAdmin, categories]);

  const pendingCount = allRequestsAdmin.filter(r => r.status === 'pending').length;

  if (authLoading || !user) {
    return (
      <DashboardLayout title="Finance">
        <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Finance">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Finance</h1>
            <p className="text-sm text-muted-foreground">
              {isSystemAdmin ? "System Dashboard (All Platform Users Accumulated Summary)" : "Track your payments, advances and reimbursements"}
            </p>
          </div>
          <ExportMenu
            build={() => ({
              title: isSystemAdmin ? 'System Wide Accumulated Finance Report' : 'Finance Report',
              userName: user.email || user.id,
              payslips: payslipsToProcess,
              requests: requestsToProcess,
              budgets: isSystemAdmin ? budgets : myBudgets,
              summary,
              categories,
            })}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto justify-start sm:justify-center h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">Approvals {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}</TabsTrigger>}
            {isLeader && <TabsTrigger value="team">Team</TabsTrigger>}
            {canManageBudgets && <TabsTrigger value="settings">Settings</TabsTrigger>}
            {canApprove && <TabsTrigger value="history">History</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW SECTION */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Period:</span>
                {(['week','month','quarter','year','lifetime','custom'] as const).map(p => (
                  <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} className="h-7 px-2 text-xs capitalize" onClick={() => setPeriod(p)}>
                    {p === 'week' ? 'Past Week' : p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : p === 'year' ? 'This Year' : p === 'lifetime' ? 'Lifetime' : 'Custom'}
                  </Button>
                ))}
                {period === 'custom' && (
                  <div className="flex items-center gap-1 ml-2">
                    <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"><CalendarIcon className="h-3 w-3" />{customFrom ? format(customFrom,'MMM d') : 'From'}</Button></PopoverTrigger><PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} /></PopoverContent></Popover>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"><CalendarIcon className="h-3 w-3" />{customTo ? format(customTo,'MMM d') : 'To'}</Button></PopoverTrigger><PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={customTo} onSelect={setCustomTo} /></PopoverContent></Popover>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <MetricCard label={isSystemAdmin ? "Total Salary Paid (Platform)" : "Total Salary Paid"} value={fmt(summary.salaryPaid)} icon={Wallet} tone="success" />
              <MetricCard label={isSystemAdmin ? "Outstanding Advances (Platform)" : "Outstanding Advance"} value={fmt(summary.outstandingAdvances)} icon={HandCoins} tone="warning" />
              <MetricCard label={isSystemAdmin ? "Cash Advances YTD (Platform)" : "Cash Advance YTD"} value={fmt(summary.cashAdvanceYtd)} icon={HandCoins} tone="info" />
              <MetricCard label={isSystemAdmin ? "Reimbursed YTD (Platform)" : "Reimbursed YTD"} value={fmt(summary.reimbursedYtd)} icon={Receipt} tone="info" />
              <MetricCard label={isSystemAdmin ? "Net Financial Position (Platform)" : "Net Position"} value={fmt(summary.net)} icon={summary.net >= 0 ? TrendingUp : TrendingDown} tone={summary.net >= 0 ? 'success' : 'danger'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">{isSystemAdmin ? "Platform Monthly Cashflow Accumulation" : "Monthly cashflow"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                          <linearGradient id="ex" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#in)" name={isSystemAdmin ? "Total Payments / Outflow" : "Income"} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#ex)" name={isSystemAdmin ? "Approved Requests Value" : "Expense"} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
                <CardContent>
                  <div className="w-full h-72">
                    {categoryBreakdown.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                    ) : (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={70}
                            innerRadius={0}
                            labelLine={false}
                            label={(e: any) => {
                              const total = categoryBreakdown.reduce((s, x) => s + x.value, 0) || 1;
                              const pct = Math.round((e.value / total) * 100);
                              return pct >= 5 ? `${pct}%` : '';
                            }}
                          >
                            {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => fmt(Number(v))} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">{isSystemAdmin ? "Platform Budget Limit Allocations Overview (This Month)" : "My budget limits (this month)"}</CardTitle></CardHeader>
              <CardContent>
                {compiledBudgetsToDisplay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active budget bounds configured.</p>
                ) : (
                  <div className="space-y-4">
                    {compiledBudgetsToDisplay.map((b) => {
                      const tone = b.pct >= 100 ? 'text-destructive' : b.pct >= 70 ? 'text-orange-600' : 'text-emerald-600';
                      return (
                        <div key={b.id} className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-medium">
                                {b.kindNames}{b.catNames}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {b.metaText} · Limit {fmt(b.limit)}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold ${tone}`}>
                              {fmt(b.used)} used · {fmt(b.remaining)} left
                            </p>
                          </div>
                          <Progress value={b.pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SALARY ADVANCE TRACKING */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <HandCoins className="h-4 w-4" />
                      {isSystemAdmin ? 'Salary Advance Tracking (Platform Accumulation)' : 'My Salary Advance Tracking'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isSystemAdmin
                        ? 'Approved salary advances and repayment status across all employees for the selected period'
                        : 'Repayment status of your approved salary advances for the selected period'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['all', 'not_paid', 'partially_paid', 'fully_paid'] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={advanceStatusFilter === s ? 'default' : 'outline'}
                        className="h-7 px-2 text-xs"
                        onClick={() => setAdvanceStatusFilter(s)}
                      >
                        {s === 'all' ? 'All' : payStatusLabel[s]}
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                          {s === 'all' ? advanceStatusSummary.all.count : advanceStatusSummary[s].count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status summary tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(['not_paid', 'partially_paid', 'fully_paid'] as const).map((s) => (
                    <div key={s} className="rounded-lg border p-3">
                      <p className={`text-xs font-medium ${payStatusTone[s]}`}>{payStatusLabel[s]}</p>
                      <p className="text-lg font-bold truncate">{fmt(advanceStatusSummary[s].amount)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {advanceStatusSummary[s].count} request{advanceStatusSummary[s].count === 1 ? '' : 's'}
                        {s !== 'fully_paid' && advanceStatusSummary[s].outstanding > 0
                          ? ` · ${fmt(advanceStatusSummary[s].outstanding)} outstanding`
                          : ''}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
                    <p className="text-lg font-bold truncate">{fmt(advanceStatusSummary.all.outstanding)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmt(advanceStatusSummary.all.paid)} repaid of {fmt(advanceStatusSummary.all.amount)}
                    </p>
                  </div>
                </div>

                {/* Detail table */}
                {visibleAdvances.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No salary advances{advanceStatusFilter !== 'all' ? ` matching “${payStatusLabel[advanceStatusFilter]}”` : ''} for this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isSystemAdmin && <TableHead>Employee</TableHead>}
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Repaid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Payment Status</TableHead>
                          {isSystemAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleAdvances.map((r: any) => (
                          <TableRow key={r.id}>
                            {isSystemAdmin && (
                              <TableCell className="font-medium">
                                {profileNameMap[r.user_id] || `${String(r.user_id).slice(0, 8)}…`}
                              </TableCell>
                            )}
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {format(new Date(r.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-medium">{fmt(r.total)}</TableCell>
                            <TableCell className="text-right text-emerald-600">{fmt(r.paidAmount)}</TableCell>
                            <TableCell className="text-right text-orange-600">{fmt(r.outstanding)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {r.installments === 2 ? '2 installments' : '1 installment'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={payStatusVariant(r.payStatus)}>{payStatusLabel[r.payStatus]}</Badge>
                            </TableCell>
                            {isSystemAdmin && (
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => {
                                    setEditAdvance(r);
                                    setEditStatus(r.payStatus);
                                    setEditPaid(String(Math.round(r.paidAmount)));
                                  }}
                                >
                                  <Edit className="h-3 w-3" /> Update
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin: update salary advance payment status */}
            <Dialog open={!!editAdvance} onOpenChange={(o) => { if (!o) setEditAdvance(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update payment status</DialogTitle>
                  <DialogDescription>
                    {editAdvance && (
                      <>
                        {profileNameMap[editAdvance.user_id] || 'Employee'} · {fmt(editAdvance.total)} salary advance
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                {editAdvance && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Payment status</Label>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AdvancePayStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_paid">Not Paid</SelectItem>
                          <SelectItem value="partially_paid">Partially Paid</SelectItem>
                          <SelectItem value="fully_paid">Fully Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editStatus === 'partially_paid' && (
                      <div className="space-y-1.5">
                        <Label>Amount paid back</Label>
                        <Input
                          type="number"
                          min={0}
                          max={editAdvance.total}
                          step="0.01"
                          value={editPaid}
                          onChange={(e) => setEditPaid(e.target.value)}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                          Of {fmt(editAdvance.total)} total · currently {fmt(editAdvance.paidAmount)} repaid
                        </p>
                        {Number(editPaid || 0) > editAdvance.total && (
                          <p className="text-xs text-destructive">Amount cannot exceed the advance total.</p>
                        )}
                      </div>
                    )}

                    {editStatus === 'fully_paid' && (
                      <p className="text-xs text-muted-foreground">Marks the full {fmt(editAdvance.total)} as repaid.</p>
                    )}
                    {editStatus === 'not_paid' && (
                      <p className="text-xs text-muted-foreground">Resets the repaid amount to {fmt(0)}.</p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditAdvance(null)}>Cancel</Button>
                  <Button
                    onClick={() => editAdvance && updateAdvancePayment.mutate({ advance: editAdvance, status: editStatus, paidInput: editPaid })}
                    disabled={
                      updateAdvancePayment.isPending ||
                      (editStatus === 'partially_paid' && (Number(editPaid || 0) <= 0 || Number(editPaid || 0) > (editAdvance?.total ?? 0)))
                    }
                  >
                    {updateAdvancePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* MY REQUESTS SECTION */}
          <TabsContent value="requests" className="space-y-4">
            <RequestsList
              requests={myRequests}
              categories={categories}
              myBudgets={myBudgets}
              userId={user.id}
              onCreate={(p) => create.mutate(p)}
              onDelete={(id) => remove.mutate(id)}
              isCreating={create.isPending}
            />
          </TabsContent>

          {/* APPROVALS MANAGEMENT */}
          {canApprove && (
            <TabsContent value="approvals" className="space-y-4">
              <ApprovalsList
                requests={allRequestsAdmin}
                categories={categories}
                budgets={budgets}
                profileNameMap={profileNameMap}
                onDecide={(id, status, note, user_id, amount) => decide.mutate({ id, status, note, approver_id: user.id, user_id, amount })}
              />
            </TabsContent>
          )}

          {/* TEAM MEMBERS SECTION */}
          {isLeader && (
            <TabsContent value="team" className="space-y-4">
              <TeamView subordinateIds={subordinateIds} />
            </TabsContent>
          )}

          {/* SETTINGS PANEL */}
          {canManageBudgets && (
            <TabsContent value="settings" className="space-y-6">
              <CategoryManager />
              <BudgetEditor />
            </TabsContent>
          )}

          {/* HISTORY */}
          {canApprove && (
            <TabsContent value="history">
              <FinanceHistory />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ---------- Reusable Subcomponents ---------- */

function MetricCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    success: 'text-emerald-600 bg-emerald-500/10',
    danger: 'text-destructive bg-destructive/10',
    warning: 'text-orange-600 bg-orange-500/10',
    info: 'text-blue-600 bg-blue-500/10',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestsList({ requests, categories, myBudgets, userId, onCreate, onDelete, isCreating }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: 'salary_advance', amount: '', reason: '', category_id: null, repayment_plan: 'one' });
  const [ack, setAck] = useState(false);
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const applicableBudget = useMemo(() => {
    return myBudgets.find((b: any) => {
      const kinds: string[] = Array.isArray(b.budget.kinds) && b.budget.kinds.length > 0
        ? b.budget.kinds : (b.budget.kind ? [b.budget.kind] : []);
      const catIds: string[] = Array.isArray(b.budget.category_ids) && b.budget.category_ids.length > 0
        ? b.budget.category_ids : (b.budget.category_id ? [b.budget.category_id] : []);
      if (!kinds.includes(form.kind)) return false;
      if (catIds.length === 0) return true;
      return form.category_id ? catIds.includes(form.category_id) : false;
    });
  }, [myBudgets, form]);

  const amount = Number(form.amount || 0);
  const limit = applicableBudget ? Number(applicableBudget.budget.monthly_limit) : 0;
  const used = applicableBudget?.used || 0;
  const projected = used + amount;
  const overBudget = !!applicableBudget && projected > limit;
  const overBy = overBudget ? projected - limit : 0;

  const submit = async () => {
    if (!form.amount || amount <= 0) return;
    if (overBudget && !ack) return;

    let receiptUrl = '';
    if (form.kind === 'reimbursement' && file) {
      setUploading(true);
      try {
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${userId}/reimbursements/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: true });
        if (uploadError) {
          toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
          setUploading(false);
          return;
        }
        receiptUrl = path;
      } catch (e: any) {
        toast({ title: 'Upload failed', description: e?.message ?? 'Could not upload document', variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onCreate({
      user_id: userId,
      kind: form.kind,
      category_id: form.kind === 'salary_advance' ? null : form.category_id,
      amount,
      reason: form.reason,
      repayment_plan: form.kind === 'salary_advance' ? form.repayment_plan : null,
      receipt_url: receiptUrl,
    });
    setOpen(false);
    setForm({ kind: 'salary_advance', amount: '', reason: '', category_id: null, repayment_plan: 'one' });
    setAck(false);
    setFile(null);
  };

  const timelineReq = requests.find((r: any) => r.id === timelineId);

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{requests.length} request(s)</p>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No requests yet</TableCell></TableRow>}
              {requests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="whitespace-nowrap">{kindLabel[r.kind as AdvanceKind]}</TableCell>
                  <TableCell className="text-xs">{categories.find((c: any) => c.id === r.category_id)?.name ?? '—'}</TableCell>
                  <TableCell className="font-semibold">{fmt(Number(r.amount))}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.approver_note || r.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setTimelineId(r.id)} title="View timeline">
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                      {r.receipt_url && (
                        <Button size="icon" variant="ghost" onClick={() => openReceipt(r.receipt_url)} title="View supporting document">
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {r.status === 'pending' && (
                        <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RequestTimeline
        open={!!timelineId}
        onOpenChange={(v) => !v && setTimelineId(null)}
        requestId={timelineId}
        request={timelineReq}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAck(false); setFile(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New finance request</DialogTitle>
            <DialogDescription>Submit a request for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => { setForm({ ...form, kind: v, category_id: null }); setAck(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary_advance">Salary Advance</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="cash_advance">Cash Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind !== 'salary_advance' && (
              <div>
                <Label>Category</Label>
                <Select value={form.category_id ?? ''} onValueChange={(v) => { setForm({ ...form, category_id: v }); setAck(false); }}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c: any) => c.kind === form.kind && c.is_active).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Amount (NGN)</Label>
              <Input type="number" value={form.amount} onChange={(e) => { setForm({ ...form, amount: e.target.value }); setAck(false); }} />
              {applicableBudget && (
                <p className="text-xs text-muted-foreground mt-1">
                  Budget: {fmt(used)} used of {fmt(limit)} • {fmt(Math.max(0, limit - used))} remaining
                </p>
              )}
              {overBudget && (
                <Alert className="mt-2 border-orange-400 bg-orange-50 dark:bg-orange-950/30">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-300">
                    This request exceeds your monthly limit by <strong>{fmt(overBy)}</strong>. You can still submit — your approver will be notified.
                  </AlertDescription>
                </Alert>
              )}
              {overBudget && (
                <label className="flex items-start gap-2 mt-2 text-xs cursor-pointer">
                  <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
                  <span>I understand this request exceeds my monthly limit.</span>
                </label>
              )}
            </div>
            {form.kind === 'salary_advance' && (
              <div>
                <Label>Repayment plan</Label>
                <Select value={form.repayment_plan} onValueChange={(v) => setForm({ ...form, repayment_plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one">One-time (next payday)</SelectItem>
                    <SelectItem value="two">Split (next 2 paydays)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Reason</Label>
              <Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            {form.kind === 'reimbursement' && (
              <div>
                <Label>Supporting document <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground truncate">
                      <Receipt className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button type="button" className="text-destructive hover:underline shrink-0" onClick={() => setFile(null)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Attach a receipt or invoice (image or PDF) to support your reimbursement.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setFile(null); setAck(false); }}>Cancel</Button>
            <Button onClick={submit} disabled={isCreating || uploading || !form.amount || (overBudget && !ack)}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {uploading ? 'Uploading…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApprovalsList({ requests, categories, budgets, profileNameMap = {}, onDecide }: any) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [noteFor, setNoteFor] = useState<{ id: string; status: 'approved' | 'rejected'; user_id?: string; amount?: number } | null>(null);
  const [note, setNote] = useState('');
  const [timelineId, setTimelineId] = useState<string | null>(null);

  const filtered = requests.filter((r: any) => filter === 'all' || r.status === 'pending');
  const timelineReq = requests.find((r: any) => r.id === timelineId);

  return (
    <>
      <div className="flex gap-2">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Pending</Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No requests.</p>}
        {filtered.map((r: any) => {
          const cat = categories.find((c: any) => c.id === r.category_id);
          const budget = budgets.find((b: any) => b.kind === r.kind && b.scope_type === 'user' && b.scope_id === r.user_id);
          const over = budget && Number(r.amount) > Number(budget.monthly_limit);
          const requesterName = profileNameMap[r.user_id] || `${String(r.user_id).slice(0, 8)}…`;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    {/* Requester name */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {requesterName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate">{requesterName}</span>
                    </div>
                    <p className="font-medium text-sm">{kindLabel[r.kind as AdvanceKind]}{cat ? ` · ${cat.name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                    {r.receipt_url && (
                      <Button size="icon" variant="ghost" onClick={() => openReceipt(r.receipt_url)} title="View supporting document">
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setTimelineId(r.id)} title="View timeline">
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xl font-bold">{fmt(Number(r.amount))}</p>
                {over && <Badge variant="outline" className="text-orange-600 border-orange-300"><AlertCircle className="h-3 w-3 mr-1" /> Over budget ({fmt(budget.monthly_limit)})</Badge>}
                {r.reason && <p className="text-sm text-muted-foreground">{r.reason}</p>}
                {r.repayment_plan && <p className="text-xs text-muted-foreground">Repayment: {r.repayment_plan === 'one' ? 'One payslip' : 'Two payslips'}</p>}
                {r.approver_note && <p className="text-xs italic">"{r.approver_note}"</p>}
                {r.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => { setNoteFor({ id: r.id, status: 'approved', user_id: r.user_id, amount: Number(r.amount) }); setNote(''); }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setNoteFor({ id: r.id, status: 'rejected', user_id: r.user_id, amount: Number(r.amount) }); setNote(''); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RequestTimeline
        open={!!timelineId}
        onOpenChange={(v) => !v && setTimelineId(null)}
        requestId={timelineId}
        request={timelineReq}
      />

      <Dialog open={!!noteFor} onOpenChange={() => setNoteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{noteFor?.status === 'approved' ? 'Approve' : 'Reject'} request</DialogTitle></DialogHeader>
          <Textarea placeholder="Add a note (required)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button disabled={!note.trim()} onClick={() => { if (noteFor) onDecide(noteFor.id, noteFor.status, note, noteFor.user_id, noteFor.amount); setNoteFor(null); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamView({ subordinateIds }: { subordinateIds: string[] }) {
  const { data: teamRequests = [] } = useQuery({
    queryKey: ['team_advance_requests', subordinateIds],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await db.from('advance_requests').select('*').in('user_id', subordinateIds).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: subordinateIds.length > 0,
  });
  const totals = useMemo(() => {
    const approved = teamRequests.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const pending = teamRequests.filter((r: any) => r.status === 'pending').reduce((s: number, r: any) => s + Number(r.amount), 0);
    return { approved, pending, count: teamRequests.length };
  }, [teamRequests]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Team requests" value={totals.count.toString()} icon={Receipt} tone="info" />
        <MetricCard label="Approved value" value={fmt(totals.approved)} icon={Wallet} tone="success" />
        <MetricCard label="Pending value" value={fmt(totals.pending)} icon={HandCoins} tone="warning" />
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {teamRequests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.created_at), 'MMM d')}</TableCell>
                  <TableCell className="text-xs font-mono">{r.user_id.slice(0, 8)}</TableCell>
                  <TableCell>{kindLabel[r.kind as AdvanceKind]}</TableCell>
                  <TableCell>{fmt(Number(r.amount))}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function CategoryManager() {
  const { categories, upsert, remove } = useFinanceCategories();
  const [adding, setAdding] = useState<{ kind: 'reimbursement' | 'cash_advance'; name: string } | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Categories</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdding({ kind: 'reimbursement', name: '' })}>+ Reimbursement</Button>
          <Button size="sm" variant="outline" onClick={() => setAdding({ kind: 'cash_advance', name: '' })}>+ Cash advance</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['reimbursement', 'cash_advance'] as const).map(k => (
            <div key={k}>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{k.replace('_', ' ')}</p>
              <div className="space-y-1">
                {categories.filter((c: any) => c.kind === k).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded px-3 py-1.5">
                    <span className="text-sm">{c.name}</span>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!adding} onOpenChange={() => setAdding(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
          <Input value={adding?.name ?? ''} onChange={(e) => setAdding({ ...(adding as any), name: e.target.value })} placeholder="Category name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(null)}>Cancel</Button>
            <Button onClick={() => { if (adding?.name) { upsert.mutate({ kind: adding.kind, name: adding.name }); setAdding(null); } }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BudgetEditor() {
  const { categories } = useFinanceCategories();
  const { budgets, upsert, remove } = useFinanceBudgets();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    scope_type: 'user',
    scope_id: '',
    kinds: ['reimbursement'] as string[],
    category_ids: [] as string[],
    monthly_limit: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['budget_users'],
    queryFn: async () => {
      const { data } = await db.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['budget_depts'],
    queryFn: async () => {
      const { data } = await db.from('departments').select('id, name');
      return data ?? [];
    },
  });

  const toggleKind = (k: string) => setForm((f: any) => ({
    ...f,
    kinds: f.kinds.includes(k) ? f.kinds.filter((x: string) => x !== k) : [...f.kinds, k],
    category_ids: f.category_ids.filter((id: string) => {
      const c = categories.find((cat: any) => cat.id === id);
      return c && [...f.kinds, k].includes(c.kind);
    }),
  }));
  const toggleCat = (id: string) => setForm((f: any) => ({
    ...f,
    category_ids: f.category_ids.includes(id) ? f.category_ids.filter((x: string) => x !== id) : [...f.category_ids, id],
  }));

  const [editingId, setEditingId] = useState<string | null>(null);

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      scope_type: b.scope_type,
      scope_id: b.scope_id,
      kinds: Array.isArray(b.kinds) && b.kinds.length ? b.kinds : (b.kind ? [b.kind] : ['reimbursement']),
      category_ids: Array.isArray(b.category_ids) && b.category_ids.length ? b.category_ids : (b.category_id ? [b.category_id] : []),
      monthly_limit: String(b.monthly_limit ?? ''),
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.scope_id || !form.monthly_limit || form.kinds.length === 0) return;
    upsert.mutate({
      ...(editingId ? { id: editingId } : {}),
      scope_type: form.scope_type,
      scope_id: form.scope_id,
      kind: form.kinds[0],
      category_id: form.category_ids[0] ?? null,
      kinds: form.kinds,
      category_ids: form.category_ids,
      monthly_limit: Number(form.monthly_limit),
    });
    setOpen(false);
    setEditingId(null);
    setForm({ scope_type: 'user', scope_id: '', kinds: ['reimbursement'], category_ids: [], monthly_limit: '' });
  };

  const scopeLabel = (b: any) => {
    if (b.scope_type === 'user') return users.find((u: any) => u.id === b.scope_id)?.full_name || b.scope_id;
    if (b.scope_type === 'department') return departments.find((d: any) => d.id === b.scope_id)?.name || b.scope_id;
    return b.scope_id;
  };
  const kindsOf = (b: any): string[] =>
    Array.isArray(b.kinds) && b.kinds.length > 0 ? b.kinds : (b.kind ? [b.kind] : []);
  const catIdsOf = (b: any): string[] =>
    Array.isArray(b.category_ids) && b.category_ids.length > 0 ? b.category_ids : (b.category_id ? [b.category_id] : []);

  const eligibleCategories = categories.filter((c: any) => form.kinds.includes(c.kind));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Budget limits</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add limit</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Scope</TableHead><TableHead>Request types</TableHead><TableHead>Categories</TableHead><TableHead>Monthly limit</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {budgets.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No budgets defined</TableCell></TableRow>}
            {budgets.map((b: any) => {
              const ks = kindsOf(b);
              const cs = catIdsOf(b);
              return (
                <TableRow key={b.id}>
                  <TableCell className="text-xs"><Badge variant="outline" className="mr-2 capitalize">{b.scope_type}</Badge>{scopeLabel(b)}</TableCell>
                  <TableCell>{ks.map(k => kindLabel[k as AdvanceKind] || k.replace('_', ' ')).join(', ')}</TableCell>
                  <TableCell className="text-xs">{cs.length === 0 ? <span className="text-muted-foreground">All</span> : cs.map(id => categories.find((c: any) => c.id === id)?.name).filter(Boolean).join(', ')}</TableCell>
                  <TableCell>{fmt(Number(b.monthly_limit))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(b)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit budget limit' : 'Add budget limit'}</DialogTitle>
            <DialogDescription>Pick one or more request types and (optionally) categories. The monthly limit is shared across all selections.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Scope</Label>
              <Select value={form.scope_type} onValueChange={(v) => setForm({ ...form, scope_type: v, scope_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.scope_type === 'role' ? 'Role name' : form.scope_type === 'user' ? 'User' : 'Department'}</Label>
              {form.scope_type === 'user' ? (
                <Select value={form.scope_id} onValueChange={(v) => setForm({ ...form, scope_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick user" /></SelectTrigger>
                  <SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.id}</SelectItem>)}</SelectContent>
                </Select>
              ) : form.scope_type === 'department' ? (
                <Select value={form.scope_id} onValueChange={(v) => setForm({ ...form, scope_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick department" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.scope_id} onChange={(e) => setForm({ ...form, scope_id: e.target.value })} placeholder="e.g. employee" />
              )}
            </div>
            <div>
              <Label>Request types (select one or more)</Label>
              <div className="grid grid-cols-1 gap-1.5 mt-1">
                {(['salary_advance', 'reimbursement', 'cash_advance'] as const).map(k => (
                  <label key={k} className="flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={form.kinds.includes(k)} onCheckedChange={() => toggleKind(k)} />
                    <span className="text-sm">{kindLabel[k]}</span>
                  </label>
                ))}
              </div>
            </div>
            {eligibleCategories.length > 0 && (
              <div>
                <Label>Categories (optional — leave empty to apply to all)</Label>
                <div className="grid grid-cols-1 gap-1.5 mt-1 max-h-40 overflow-y-auto">
                  {eligibleCategories.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={form.category_ids.includes(c.id)} onCheckedChange={() => toggleCat(c.id)} />
                      <span className="text-sm">{c.name} <span className="text-xs text-muted-foreground">({c.kind.replace('_', ' ')})</span></span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Combined monthly limit (NGN)</Label>
              <Input type="number" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">
                Example: ₦50,000 for Reimbursement + Cash advance across Travel + Meals = a single shared cap.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
