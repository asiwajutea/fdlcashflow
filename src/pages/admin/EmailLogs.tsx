import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Mail, Search, X, RefreshCw, CheckCircle2, XCircle, MinusCircle, Send, FlaskConical, CalendarDays } from 'lucide-react';
import { SchedulePreview } from '@/components/SchedulePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PAGE_SIZE = 50;

const statusVariant = (s: string) =>
  s === 'sent' ? 'default' : s === 'failed' ? 'destructive' : 'secondary';

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'sent')    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === 'failed')  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
};

const TEMPLATE_LABELS: Record<string, string> = {
  candidate_screening:  'Candidate — Screening',
  candidate_interview:  'Candidate — Interview',
  candidate_offered:    'Candidate — Offer',
  candidate_hired:      'Candidate — Hired',
  candidate_rejected:   'Candidate — Rejected',
  payslip:              'Payslip',
  finance_decision:     'Finance Decision',
  user_approved:        'User Approved',
  new_message:          'New Message',
  account_created:      'Account Created',
};

export default function EmailLogs() {
  const { toast } = useToast();
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [page, setPage]                 = useState(1);
  const [testOpen, setTestOpen]         = useState(false);
  const [testEmail, setTestEmail]       = useState('');
  const [testTemplate, setTestTemplate] = useState('test_email');
  const [sending, setSending]           = useState(false);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email_logs'],
    queryFn: async () => {
      const { data, error } = await db
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = [...logs];
    if (filterStatus !== 'all')   list = list.filter((l: any) => l.status === filterStatus);
    if (filterTemplate !== 'all') list = list.filter((l: any) => l.template_key === filterTemplate);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l: any) =>
        l.recipient_email?.toLowerCase().includes(q) ||
        l.recipient_name?.toLowerCase().includes(q) ||
        l.subject?.toLowerCase().includes(q) ||
        l.template_key?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, filterStatus, filterTemplate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => ({
    total:   logs.length,
    sent:    logs.filter((l: any) => l.status === 'sent').length,
    failed:  logs.filter((l: any) => l.status === 'failed').length,
    skipped: logs.filter((l: any) => l.status === 'skipped').length,
  }), [logs]);

  const templates: string[] = Array.from(new Set<string>((logs as any[]).map((l) => String(l.template_key)))).sort();

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Email required', description: 'Please enter a recipient email address.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: testTemplate,
          to: testEmail.trim(),
          name: 'Admin',
          vars: {
            origin: window.location.origin,
            // Holiday template needs a holiday name
            ...(testTemplate === 'holiday_greeting' ? { holiday: 'New Year' } : {}),
            // Inbox digest needs a count
            ...(testTemplate === 'inbox_digest' ? { count: '3', previews: '1. Welcome to FDL<br/>2. Your payslip is ready<br/>3. Action required' } : {}),
          },
        },
      });
      if (error || data?.error) {
        toast({ title: 'Send failed', description: error?.message || data?.error || 'Unknown error', variant: 'destructive' });
      } else {
        toast({ title: 'Test email sent ✅', description: `Email sent to ${testEmail} — check your inbox and the logs below.` });
        setTestOpen(false);
        setTestEmail('');
        setTimeout(() => refetch(), 1500);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Email Logs">
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Email Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">All emails sent through the platform</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setTestOpen(true)} className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Send Test Email
            </Button>
          </div>
        </div>

        <Tabs defaultValue="logs">
          <TabsList>
            <TabsTrigger value="logs" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Logs</TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> 7-Day Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <SchedulePreview mode="email" />
          </TabsContent>

          <TabsContent value="logs" className="space-y-5 mt-4">

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sent',  value: summary.total,   color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' },
            { label: 'Delivered',   value: summary.sent,    color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' },
            { label: 'Failed',      value: summary.failed,  color: 'bg-red-50 dark:bg-red-950/20 text-red-600' },
            { label: 'Skipped',     value: summary.skipped, color: 'bg-muted/60 text-muted-foreground' },
          ].map(t => (
            <div key={t.label} className={`rounded-xl border p-4 ${t.color}`}>
              <p className="text-2xl font-bold">{t.value}</p>
              <p className="text-xs font-medium mt-0.5">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search email, name, subject…" className="pl-8 h-8 text-sm" />
            {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTemplate} onValueChange={v => { setFilterTemplate(v); setPage(1); }}>
            <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {templates.map(t => <SelectItem key={t} value={t}>{TEMPLATE_LABELS[t] || t}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterTemplate !== 'all' || search) && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground"
              onClick={() => { setSearch(''); setFilterStatus('all'); setFilterTemplate('all'); setPage(1); }}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Resend ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Loading…</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No email logs found.</TableCell></TableRow>
                ) : paginated.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/20">
                    <TableCell><StatusIcon status={log.status} /></TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{log.recipient_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{TEMPLATE_LABELS[log.template_key] || log.template_key}</span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[200px] truncate" title={log.subject}>{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(log.status)} className="text-xs capitalize">{log.status}</Badge>
                      {log.error && <p className="text-[10px] text-destructive mt-0.5 max-w-[150px] truncate" title={log.error}>{log.error}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.resend_id ? log.resend_id.slice(0, 16) + '…' : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(1)}>«</Button>
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</Button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const s=Math.max(1,Math.min(page-2,totalPages-4));const p=s+i;return <Button key={p} size="icon" variant={p===page?'default':'outline'} className="h-7 w-7 text-xs" onClick={()=>setPage(p)}>{p}</Button>;})}
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</Button>
              <Button size="icon" variant="outline" className="h-7 w-7" disabled={page===totalPages} onClick={()=>setPage(totalPages)}>»</Button>
            </div>
          </div>
        )}

          </TabsContent>
          </Tabs>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Recipient email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendTest()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template to test</Label>
              <Select value={testTemplate} onValueChange={setTestTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test_email">Test Email (generic)</SelectItem>
                  <SelectItem value="holiday_greeting">Holiday Greeting</SelectItem>
                  <SelectItem value="candidate_screening">Candidate — Screening</SelectItem>
                  <SelectItem value="candidate_interview">Candidate — Interview</SelectItem>
                  <SelectItem value="candidate_offered">Candidate — Offer</SelectItem>
                  <SelectItem value="candidate_hired">Candidate — Hired</SelectItem>
                  <SelectItem value="candidate_rejected">Candidate — Rejected</SelectItem>
                  <SelectItem value="payslip">Payslip</SelectItem>
                  <SelectItem value="finance_decision">Finance Decision</SelectItem>
                  <SelectItem value="user_approved">User Approved</SelectItem>
                  <SelectItem value="account_created">Account Created</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The email will be sent with sample placeholder data.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTest} disabled={sending || !testEmail.trim()} className="gap-1.5">
              {sending ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sending…</> : <><Send className="h-3.5 w-3.5" /> Send Test</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
