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
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, TrendingDown, HandCoins, Plus, Check, X, AlertCircle, Edit, Trash2, Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0B1F3B', '#FF7A00', '#10b981', '#8b5cf6', '#ef4444'];
const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

const kindLabel: Record<AdvanceKind, string> = {
  salary_advance: 'Salary Advance',
  reimbursement: 'Reimbursement',
  cash_advance: 'Cash Advance',
};
const statusVariant = (s: string): any =>
  s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'repaid' ? 'secondary' : 'outline';

export default function Finance() {
  const { user, role, capabilities, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin';
  const canApprove = isAdmin || capabilities.includes('approve_finance_requests');
  const canManageBudgets = isAdmin || capabilities.includes('manage_finance_budgets');

  const { transactions } = useTransactions({});
  const { requests: myRequests, create, remove } = useAdvanceRequests({ userId: user?.id ?? null });
  const { requests: allRequests, decide } = useAdvanceRequests(canApprove ? {} : { userId: user?.id ?? null });
  const { categories } = useFinanceCategories();
  const { budgets } = useFinanceBudgets();

  // Subordinate scope
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

  // Personal summary derived from transactions + my advances
  const summary = useMemo(() => {
    const salaryPaid = transactions.filter(t => t.type === 'income' && /salary|payroll|payslip/i.test(t.category)).reduce((s, t) => s + Number(t.amount), 0);
    const incomeTotal = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expensesTotal = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const outstandingAdvances = myRequests
      .filter(r => r.status === 'approved' && r.kind === 'salary_advance')
      .reduce((s, r) => s + Number(r.amount), 0);
    const reimbursedYtd = myRequests
      .filter(r => r.status === 'approved' && r.kind === 'reimbursement')
      .reduce((s, r) => s + Number(r.amount), 0);
    return { salaryPaid: salaryPaid || incomeTotal, expensesTotal, outstandingAdvances, reimbursedYtd, net: (salaryPaid || incomeTotal) - expensesTotal };
  }, [transactions, myRequests]);

  // monthly chart
  const monthly = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number }> = {};
    transactions.forEach(t => {
      const m = format(new Date(t.date), 'MMM yy');
      if (!map[m]) map[m] = { month: m, income: 0, expense: 0 };
      if (t.type === 'income') map[m].income += Number(t.amount); else map[m].expense += Number(t.amount);
    });
    return Object.values(map).slice(-12);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const byKind: Record<string, number> = { 'Salary Payment': 0, 'Salary Advance': 0, 'Reimbursement': 0, 'Cash Advance': 0 };
    byKind['Salary Payment'] = summary.salaryPaid;
    myRequests.filter(r => r.status === 'approved').forEach(r => {
      byKind[kindLabel[r.kind]] += Number(r.amount);
    });
    return Object.entries(byKind).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [myRequests, summary]);

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

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
            <p className="text-sm text-muted-foreground">Track your payments, advances and reimbursements</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto justify-start sm:justify-center h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            {canApprove && <TabsTrigger value="approvals">Approvals {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}</TabsTrigger>}
            {isLeader && <TabsTrigger value="team">Team</TabsTrigger>}
            {canManageBudgets && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label="Total Salary Paid" value={fmt(summary.salaryPaid)} icon={Wallet} tone="success" />
              <MetricCard label="Outstanding Advance" value={fmt(summary.outstandingAdvances)} icon={HandCoins} tone="warning" />
              <MetricCard label="Reimbursed YTD" value={fmt(summary.reimbursedYtd)} icon={Receipt} tone="info" />
              <MetricCard label="Net Position" value={fmt(summary.net)} icon={summary.net >= 0 ? TrendingUp : TrendingDown} tone={summary.net >= 0 ? 'success' : 'danger'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Monthly cashflow</CardTitle></CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer>
                      <AreaChart data={monthly}>
                        <defs>
                          <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                          <linearGradient id="ex" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#in)" />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#ex)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    {categoryBreakdown.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                    ) : (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={80} label={(e: any) => e.name}>
                            {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => fmt(Number(v))} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MY REQUESTS */}
          <TabsContent value="requests" className="space-y-4">
            <RequestsList
              requests={myRequests}
              categories={categories}
              budgets={budgets}
              userId={user.id}
              onCreate={(p) => create.mutate(p)}
              onDelete={(id) => remove.mutate(id)}
              isCreating={create.isPending}
            />
          </TabsContent>

          {/* APPROVALS */}
          {canApprove && (
            <TabsContent value="approvals" className="space-y-4">
              <ApprovalsList
                requests={allRequests}
                categories={categories}
                budgets={budgets}
                onDecide={(id, status, note) => decide.mutate({ id, status, note, approver_id: user.id })}
              />
            </TabsContent>
          )}

          {/* TEAM */}
          {isLeader && (
            <TabsContent value="team" className="space-y-4">
              <TeamView subordinateIds={subordinateIds} />
            </TabsContent>
          )}

          {/* SETTINGS */}
          {canManageBudgets && (
            <TabsContent value="settings" className="space-y-6">
              <CategoryManager />
              <BudgetEditor />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ---------- Subcomponents ---------- */

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

function RequestsList({ requests, categories, budgets, userId, onCreate, onDelete, isCreating }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: 'salary_advance', amount: '', reason: '', category_id: null, repayment_plan: 'one' });

  const applicableBudget = useMemo(() => {
    return budgets.find((b: any) => b.kind === form.kind && (!b.category_id || b.category_id === form.category_id) && (b.scope_type === 'user' && b.scope_id === userId));
  }, [budgets, form, userId]);
  const overBudget = applicableBudget && Number(form.amount || 0) > Number(applicableBudget.monthly_limit);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    onCreate({
      user_id: userId,
      kind: form.kind,
      category_id: form.kind === 'salary_advance' ? null : form.category_id,
      amount: Number(form.amount),
      reason: form.reason,
      repayment_plan: form.kind === 'salary_advance' ? form.repayment_plan : null,
    });
    setOpen(false);
    setForm({ kind: 'salary_advance', amount: '', reason: '', category_id: null, repayment_plan: 'one' });
  };

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
                    {r.status === 'pending' && (
                      <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New finance request</DialogTitle>
            <DialogDescription>Submit a request for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v, category_id: null })}>
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
                <Select value={form.category_id ?? ''} onValueChange={(v) => setForm({ ...form, category_id: v })}>
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
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              {overBudget && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Exceeds your monthly limit of {fmt(applicableBudget.monthly_limit)} — approver will be notified.</p>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={isCreating || !form.amount}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApprovalsList({ requests, categories, budgets, onDecide }: any) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [noteFor, setNoteFor] = useState<{ id: string; status: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');

  const filtered = requests.filter((r: any) => filter === 'all' || r.status === 'pending');

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
          return (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold">{kindLabel[r.kind as AdvanceKind]}{cat ? ` · ${cat.name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                </div>
                <p className="text-xl font-bold">{fmt(Number(r.amount))}</p>
                {over && <Badge variant="outline" className="text-orange-600 border-orange-300"><AlertCircle className="h-3 w-3 mr-1" /> Over budget ({fmt(budget.monthly_limit)})</Badge>}
                {r.reason && <p className="text-sm text-muted-foreground">{r.reason}</p>}
                {r.repayment_plan && <p className="text-xs text-muted-foreground">Repayment: {r.repayment_plan === 'one' ? 'One payslip' : 'Two payslips'}</p>}
                {r.approver_note && <p className="text-xs italic">"{r.approver_note}"</p>}
                {r.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => { setNoteFor({ id: r.id, status: 'approved' }); setNote(''); }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setNoteFor({ id: r.id, status: 'rejected' }); setNote(''); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!noteFor} onOpenChange={() => setNoteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{noteFor?.status === 'approved' ? 'Approve' : 'Reject'} request</DialogTitle></DialogHeader>
          <Textarea placeholder="Add a note (required)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button disabled={!note.trim()} onClick={() => { if (noteFor) onDecide(noteFor.id, noteFor.status, note); setNoteFor(null); }}>Confirm</Button>
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
  const [form, setForm] = useState<any>({ scope_type: 'user', scope_id: '', kind: 'reimbursement', category_id: null, monthly_limit: '' });

  // Load users/roles/departments for scope picker
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

  const save = () => {
    if (!form.scope_id || !form.monthly_limit) return;
    upsert.mutate({
      scope_type: form.scope_type,
      scope_id: form.scope_id,
      kind: form.kind,
      category_id: form.kind === 'salary_advance' ? null : form.category_id,
      monthly_limit: Number(form.monthly_limit),
    });
    setOpen(false);
  };

  const scopeLabel = (b: any) => {
    if (b.scope_type === 'user') return users.find((u: any) => u.id === b.scope_id)?.full_name || b.scope_id;
    if (b.scope_type === 'department') return departments.find((d: any) => d.id === b.scope_id)?.name || b.scope_id;
    return b.scope_id;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Budget limits</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add limit</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Scope</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Monthly limit</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {budgets.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No budgets defined</TableCell></TableRow>}
            {budgets.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs"><Badge variant="outline" className="mr-2 capitalize">{b.scope_type}</Badge>{scopeLabel(b)}</TableCell>
                <TableCell className="capitalize">{b.kind.replace('_', ' ')}</TableCell>
                <TableCell>{categories.find((c: any) => c.id === b.category_id)?.name ?? '—'}</TableCell>
                <TableCell>{fmt(Number(b.monthly_limit))}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add budget limit</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
              <Label>Request type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v, category_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary_advance">Salary advance</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="cash_advance">Cash advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind !== 'salary_advance' && (
              <div>
                <Label>Category (optional)</Label>
                <Select value={form.category_id ?? ''} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>{categories.filter((c: any) => c.kind === form.kind).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Monthly limit (NGN)</Label>
              <Input type="number" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} />
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
