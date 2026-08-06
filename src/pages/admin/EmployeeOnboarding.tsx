import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Users, Search, CheckCircle2, XCircle, Clock, FileText,
  Loader2, ChevronDown, ChevronUp, PenTool, Settings2,
  Plus, Trash2, Save, AlertCircle, ClipboardList,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

interface OnboardingRecord {
  id?: string;
  user_id: string;
  item_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
}

interface ContractRow {
  id: string;
  user_id: string | null;
  application_id: string | null;
  status: string;
  signed_at: string | null;
  signed_full_name: string | null;
  body_html: string | null;
  template_id: string | null;
  created_at: string;
  // resolved
  employee_name?: string | null;
  template_title?: string | null;
}

interface Employee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  position?: string | null;
  department?: string | null;
  employment_start_date?: string | null;
  // computed
  completion: number;           // 0–100
  completedItems: number;
  totalItems: number;
  contracts: ContractRow[];
  checklistMap: Record<string, OnboardingRecord>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const CATEGORY_COLORS: Record<string, string> = {
  HR:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Finance:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  IT:         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Compliance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  General:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

function EmployeeRow({
  emp,
  items,
  onToggle,
  onNotesSave,
}: {
  emp: Employee;
  items: ChecklistItem[];
  onToggle: (emp: Employee, item: ChecklistItem, done: boolean) => void;
  onNotesSave: (emp: Employee, item: ChecklistItem, notes: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notesItem, setNotesItem] = useState<ChecklistItem | null>(null);
  const [notesVal,  setNotesVal]  = useState('');

  const categories = useMemo(() =>
    [...new Set(items.map(i => i.category))],
    [items],
  );

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen(v => !v)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={emp.avatar_url ?? undefined} />
              <AvatarFallback>{initials(emp.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{emp.full_name || '—'}</p>
                {emp.employee_id && (
                  <Badge variant="outline" className="text-xs py-0">{emp.employee_id}</Badge>
                )}
                {emp.position && (
                  <span className="text-xs text-muted-foreground">{emp.position}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <Progress value={emp.completion} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {emp.completedItems}/{emp.totalItems}
                  </span>
                </div>
                {/* Contract badges */}
                {emp.contracts.map(c => (
                  <Badge
                    key={c.id}
                    variant={c.signed_at ? 'default' : 'secondary'}
                    className={`text-xs gap-1 py-0 ${c.signed_at ? 'bg-green-600 hover:bg-green-600' : ''}`}
                  >
                    {c.signed_at ? <><CheckCircle2 className="h-3 w-3" /> Signed</> : <><Clock className="h-3 w-3" /> Contract pending</>}
                  </Badge>
                ))}
                {emp.contracts.length === 0 && (
                  <Badge variant="outline" className="text-xs gap-1 py-0 text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3" /> No contract
                  </Badge>
                )}
              </div>
            </div>
            <div className="shrink-0">
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <CardContent className="pt-0 pb-4 space-y-5">
          <Separator />

          {/* Contracts section */}
          {emp.contracts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Contracts
              </p>
              <div className="space-y-2">
                {emp.contracts.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{c.template_title || 'Contract'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sent {format(parseISO(c.created_at), 'MMM d, yyyy')}
                        {c.signed_at && ` · Signed ${format(parseISO(c.signed_at), 'MMM d, yyyy')}`}
                        {c.signed_full_name && ` by "${c.signed_full_name}"`}
                      </p>
                    </div>
                    <Badge variant={c.signed_at ? 'default' : 'secondary'} className={`text-xs shrink-0 ${c.signed_at ? 'bg-green-600 hover:bg-green-600' : ''}`}>
                      {c.signed_at ? 'Signed' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist by category */}
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat && i.is_active);
            if (!catItems.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.General}`}>{cat}</span>
                </p>
                <div className="space-y-1.5">
                  {catItems.map(item => {
                    const rec = emp.checklistMap[item.id];
                    const done = rec?.completed ?? false;
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0"
                          onClick={() => onToggle(emp, item, !done)}
                        >
                          {done
                            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                            : <div className="h-5 w-5 rounded-full border-2 border-border" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {item.title}
                            </p>
                            {item.is_required && !done && (
                              <span className="text-[10px] text-destructive font-medium">Required</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          {rec?.completed_at && (
                            <p className="text-[10px] text-green-600 mt-0.5">
                              Completed {format(parseISO(rec.completed_at), 'MMM d, yyyy')}
                            </p>
                          )}
                          {rec?.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{rec.notes}"</p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-primary hover:underline"
                          onClick={() => { setNotesItem(item); setNotesVal(rec?.notes ?? ''); }}
                        >
                          Note
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}

      {/* Notes dialog */}
      <Dialog open={!!notesItem} onOpenChange={o => !o && setNotesItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Note for: {notesItem?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={notesVal}
            onChange={e => setNotesVal(e.target.value)}
            placeholder="Add a note about this task…"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesItem(null)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (notesItem) { onNotesSave(emp, notesItem, notesVal); setNotesItem(null); }
            }}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeOnboarding() {
  const { user, role, loading: authLoading, hasCapability } = useAuth();
  const { toast } = useToast();

  if (!authLoading && role !== 'admin' && !hasCapability('manage_onboarding')) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [items,       setItems]       = useState<ChecklistItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterTab,   setFilterTab]   = useState<'all' | 'incomplete' | 'complete'>('all');

  // Checklist item editor
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editItems,    setEditItems]    = useState<ChecklistItem[]>([]);
  const [savingItems,  setSavingItems]  = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load checklist items
      const { data: rawItems } = await db
        .from('onboarding_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      const checklistItems = (rawItems as ChecklistItem[]) || [];
      setItems(checklistItems);

      // 2. Load active employees
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, avatar_url, employee_id, employment_start_date, positions(name), departments(name)')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('full_name');
      let profs = (profiles as any[]) || [];
      if (!profs.length) { setEmployees([]); setLoading(false); return; }

      // 2b. Keep staff only — exclude job candidates / guests
      const { data: roleRows } = await db
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profs.map(p => p.id));
      const staffIds = new Set(
        ((roleRows as any[]) || [])
          .filter(r => r.role === 'employee' || r.role === 'admin')
          .map(r => r.user_id)
      );
      profs = profs.filter(p => staffIds.has(p.id));
      if (!profs.length) { setEmployees([]); setLoading(false); return; }
      const empIds = profs.map(p => p.id);

      // 3. Load all onboarding records for these employees
      const { data: records } = await db
        .from('employee_onboarding')
        .select('*')
        .in('user_id', empIds);
      const recs = (records as OnboardingRecord[]) || [];

      // 4. Load contracts (direct user_id assignment)
      const { data: userContracts } = await db
        .from('contracts')
        .select('id, user_id, application_id, status, signed_at, signed_full_name, body_html, template_id, created_at, contract_templates(title)')
        .in('user_id', empIds);
      const uContracts = (userContracts as any[]) || [];

      // 5. Load template map for contracts
      const templateMap: Record<string, string> = {};
      uContracts.forEach((c: any) => {
        if (c.contract_templates?.title) templateMap[c.template_id] = c.contract_templates.title;
      });

      // 6. Assemble employees
      const assembled: Employee[] = profs.map(p => {
        const empRecs = recs.filter(r => r.user_id === p.id);
        const checklistMap: Record<string, OnboardingRecord> = {};
        empRecs.forEach(r => { checklistMap[r.item_id] = r; });

        const requiredItems = checklistItems.filter(i => i.is_required);
        const completedRequired = requiredItems.filter(i => checklistMap[i.id]?.completed).length;
        const totalItems = checklistItems.length;
        const completedItems = checklistItems.filter(i => checklistMap[i.id]?.completed).length;
        const completion = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        const contracts: ContractRow[] = uContracts
          .filter((c: any) => c.user_id === p.id)
          .map((c: any) => ({
            id:              c.id,
            user_id:         c.user_id,
            application_id:  c.application_id,
            status:          c.status,
            signed_at:       c.signed_at,
            signed_full_name: c.signed_full_name,
            body_html:       c.body_html,
            template_id:     c.template_id,
            created_at:      c.created_at,
            employee_name:   p.full_name,
            template_title:  c.contract_templates?.title || 'Contract',
          }));

        return {
          id:                   p.id,
          full_name:            p.full_name,
          avatar_url:           p.avatar_url,
          employee_id:          p.employee_id,
          position:             p.positions?.name || null,
          department:           p.departments?.name || null,
          employment_start_date: p.employment_start_date,
          completion,
          completedItems,
          totalItems,
          contracts,
          checklistMap,
        };
      });
      setEmployees(assembled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Local (silent) patch of one checklist record — avoids a full page reload
  const patchLocal = (empId: string, itemId: string, patch: Partial<OnboardingRecord>) => {
    setEmployees(prev => prev.map(e => {
      if (e.id !== empId) return e;
      const checklistMap = {
        ...e.checklistMap,
        [itemId]: { ...(e.checklistMap[itemId] || ({ user_id: empId, item_id: itemId } as any)), ...patch },
      };
      const completedItems = items.filter(i => checklistMap[i.id]?.completed).length;
      const totalItems = items.length;
      return {
        ...e,
        checklistMap,
        completedItems,
        totalItems,
        completion: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      };
    }));
  };

  // ── Toggle checklist item ─────────────────────────────────────────────────
  const handleToggle = async (emp: Employee, item: ChecklistItem, done: boolean) => {
    const existing = emp.checklistMap[item.id];
    const payload: any = {
      user_id:      emp.id,
      item_id:      item.id,
      completed:    done,
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? user?.id : null,
    };
    // Optimistic UI update — no reload
    patchLocal(emp.id, item.id, payload);
    const { error } = existing?.id
      ? await db.from('employee_onboarding').update(payload).eq('id', existing.id)
      : await db.from('employee_onboarding').upsert(payload, { onConflict: 'user_id,item_id' });
    if (error) {
      patchLocal(emp.id, item.id, { completed: !done } as any);
      toast({ title: 'Could not update item', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: done ? 'Item marked complete' : 'Item marked incomplete' });
  };

  // ── Save notes ────────────────────────────────────────────────────────────
  const handleNotesSave = async (emp: Employee, item: ChecklistItem, notes: string) => {
    const { error } = await db.from('employee_onboarding').upsert(
      { user_id: emp.id, item_id: item.id, notes, completed: emp.checklistMap[item.id]?.completed ?? false },
      { onConflict: 'user_id,item_id' },
    );
    if (error) {
      toast({ title: 'Could not save note', description: error.message, variant: 'destructive' });
      return;
    }
    patchLocal(emp.id, item.id, { notes } as any);
    toast({ title: 'Note saved' });
  };


  // ── Save checklist items (admin settings) ────────────────────────────────
  const saveItems = async () => {
    setSavingItems(true);
    for (const item of editItems) {
      if (item.id.startsWith('new:')) {
        const { id: _id, ...rest } = item as any;
        await db.from('onboarding_checklist_items').insert(rest);
      } else {
        await db.from('onboarding_checklist_items').update({
          title: item.title, description: item.description, category: item.category,
          is_required: item.is_required, sort_order: item.sort_order, is_active: item.is_active,
        }).eq('id', item.id);
      }
    }
    setSavingItems(false);
    setSettingsOpen(false);
    toast({ title: 'Checklist updated' });
    load();
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q)
      );
    }
    if (filterTab === 'incomplete') list = list.filter(e => e.completion < 100);
    if (filterTab === 'complete')   list = list.filter(e => e.completion === 100);
    return list;
  }, [employees, search, filterTab]);

  // ── Summary KPIs ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total      = employees.length;
    const complete   = employees.filter(e => e.completion === 100).length;
    const noContract = employees.filter(e => e.contracts.length === 0).length;
    const unsigned   = employees.filter(e => e.contracts.some(c => !c.signed_at)).length;
    const signed     = employees.filter(e => e.contracts.length > 0 && e.contracts.every(c => c.signed_at)).length;
    return { total, complete, noContract, unsigned, signed };
  }, [employees]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Employee Onboarding">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Employee Onboarding</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track contracts, signatures, and onboarding tasks for every employee.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setEditItems(items.map(i => ({ ...i }))); setSettingsOpen(true); }} className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Manage Checklist
          </Button>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Employees',   value: kpis.total,      icon: Users,         color: 'bg-primary' },
            { label: 'Fully Onboarded',   value: kpis.complete,   icon: CheckCircle2,  color: 'bg-green-500' },
            { label: 'Contracts Signed',  value: kpis.signed,     icon: PenTool,       color: 'bg-blue-500' },
            { label: 'Pending Signature', value: kpis.unsigned,   icon: Clock,         color: 'bg-amber-500' },
            { label: 'No Contract Yet',   value: kpis.noContract, icon: AlertCircle,   color: 'bg-destructive' },
          ].map(k => (
            <Card key={k.label} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className={`p-2 rounded-lg ${k.color} w-fit mb-2`}>
                  <k.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* ── Filters ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input className="pl-9" placeholder="Search by name, ID or position…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Tabs value={filterTab} onValueChange={v => setFilterTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
              <TabsTrigger value="incomplete">Incomplete ({employees.filter(e => e.completion < 100).length})</TabsTrigger>
              <TabsTrigger value="complete">Complete ({employees.filter(e => e.completion === 100).length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ── Employee list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No employees found{search ? ` for "${search}"` : ''}.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(emp => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                items={items}
                onToggle={handleToggle}
                onNotesSave={handleNotesSave}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ Checklist settings dialog ═════════════════════════════════════════ */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">Manage Onboarding Checklist</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {editItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={item.title}
                    onChange={e => { const copy = [...editItems]; copy[idx] = { ...item, title: e.target.value }; setEditItems(copy); }}
                    placeholder="Task title"
                    className="text-sm"
                  />
                  <Input
                    value={item.category}
                    onChange={e => { const copy = [...editItems]; copy[idx] = { ...item, category: e.target.value }; setEditItems(copy); }}
                    placeholder="Category (HR, IT…)"
                    className="text-sm"
                  />
                  <Input
                    value={item.description ?? ''}
                    onChange={e => { const copy = [...editItems]; copy[idx] = { ...item, description: e.target.value || null }; setEditItems(copy); }}
                    placeholder="Description (optional)"
                    className="text-sm col-span-2"
                  />
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={item.is_required}
                      onChange={e => { const copy = [...editItems]; copy[idx] = { ...item, is_required: e.target.checked }; setEditItems(copy); }} />
                    Required
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={item.is_active}
                      onChange={e => { const copy = [...editItems]; copy[idx] = { ...item, is_active: e.target.checked }; setEditItems(copy); }} />
                    Active
                  </label>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0 mt-0.5"
                  onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5 w-full"
              onClick={() => setEditItems(prev => [...prev, {
                id: `new:${Date.now()}`, title: '', description: null,
                category: 'General', is_required: false, sort_order: (prev.length + 1) * 10, is_active: true,
              }])}>
              <Plus className="h-4 w-4" /> Add task
            </Button>
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={savingItems}>Cancel</Button>
            <Button onClick={saveItems} disabled={savingItems} className="gap-1.5">
              {savingItems ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
