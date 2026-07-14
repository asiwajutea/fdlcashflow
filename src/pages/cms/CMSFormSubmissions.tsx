import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Download, Eye, BarChart3, Check, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ApprovalBadge = ({ status }: { status?: string }) => {
  if (!status || status === 'not_required') return <span className="text-xs text-muted-foreground">—</span>;
  if (status === 'pending') return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  if (status === 'approved') return <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1"><Check className="h-3 w-3" /> Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
  return null;
};

const CMSFormSubmissions = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [view, setView] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'not_required'>('all');

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = async () => {
    const [{ data: f }, { data: ff }, { data: ss }] = await Promise.all([
      db.from('activity_forms').select('*').eq('id', id).single(),
      db.from('activity_form_fields').select('*').eq('form_id', id).order('display_order'),
      db.from('activity_form_submissions').select('*').eq('form_id', id).order('submitted_at', { ascending: false }),
    ]);
    setForm(f);
    setFields(ff || []);
    setSubmissions(ss || []);
    const userIds = [...new Set((ss || []).map((s: any) => s.user_id))];
    if (userIds.length) {
      const { data: ps } = await db.from('profiles').select('id,full_name,email').in('id', userIds);
      const map: any = {};
      (ps || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [id]);

  const filtered = submissions.filter((s) =>
    statusFilter === 'all' ? true : (s.approval_status || 'not_required') === statusFilter
  );

  const pendingCount = submissions.filter((s) => s.approval_status === 'pending').length;

  const handleApprove = async (s: any) => {
    if (!user) return;
    setDeciding(s.id);
    const { error } = await db.from('activity_form_submissions').update({
      approval_status: 'approved',
      approver_id: user.id,
      decided_at: new Date().toISOString(),
    }).eq('id', s.id);

    if (error) { toast.error(error.message); setDeciding(null); return; }

    await db.from('activity_form_submission_events').insert({
      submission_id: s.id,
      actor_id: user.id,
      event_type: 'approved',
      note: '',
    }).then(() => {});

    // Notify submitter
    supabase.functions.invoke('send-sms', {
      body: {
        user_id: s.user_id,
        template_key: 'form_submission_decision',
        vars: { form: form?.title || '', status: 'approved', note: '' },
      },
    }).catch(() => {});

    toast.success('Submission approved');
    setDeciding(null);
    load();
  };

  const handleRejectConfirm = async () => {
    if (!user || !rejectTarget) return;
    if (!rejectNote.trim()) { toast.error('Please provide a reason for rejection'); return; }
    setDeciding(rejectTarget.id);

    const { error } = await db.from('activity_form_submissions').update({
      approval_status: 'rejected',
      approver_id: user.id,
      approver_note: rejectNote.trim(),
      decided_at: new Date().toISOString(),
    }).eq('id', rejectTarget.id);

    if (error) { toast.error(error.message); setDeciding(null); return; }

    await db.from('activity_form_submission_events').insert({
      submission_id: rejectTarget.id,
      actor_id: user.id,
      event_type: 'rejected',
      note: rejectNote.trim(),
    }).then(() => {});

    // Notify submitter
    supabase.functions.invoke('send-sms', {
      body: {
        user_id: rejectTarget.user_id,
        template_key: 'form_submission_decision',
        vars: { form: form?.title || '', status: 'rejected', note: ` Reason: ${rejectNote.trim()}` },
      },
    }).catch(() => {});

    toast.success('Submission rejected');
    setDeciding(null);
    setRejectTarget(null);
    setRejectNote('');
    load();
  };

  const exportCsv = () => {
    if (!submissions.length) return;
    const headers = ['User', 'Email', 'Period', 'Submitted', 'Approval Status', 'Approver Note', ...fields.map((f) => f.label)];
    const rows = submissions.map((s) => {
      const p = profiles[s.user_id] || {};
      return [
        p.full_name || '',
        p.email || '',
        s.period_key,
        new Date(s.submitted_at).toISOString(),
        s.approval_status || 'not_required',
        s.approver_note || '',
        ...fields.map((f) => {
          const v = s.answers?.[f.field_key];
          if (Array.isArray(v)) return v.join('; ');
          return v ?? '';
        }),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.title || 'submissions'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  if (!form) return <DashboardLayout title="Submissions"><p className="text-muted-foreground">Loading…</p></DashboardLayout>;

  return (
    <DashboardLayout title="Submissions">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/cms/activity-forms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">{form.title} — Submissions</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{submissions.length} response{submissions.length !== 1 ? 's' : ''}</span>
              {pendingCount > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs">
                  {pendingCount} pending approval
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/cms/activity-forms/${id}/analytics`}><Button variant="outline"><BarChart3 className="h-4 w-4 mr-2" /> Analytics</Button></Link>
          <Button variant="outline" onClick={exportCsv} disabled={!submissions.length}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({submissions.length})</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            Pending
            {pendingCount > 0 && (
              <span className="rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({submissions.filter(s => s.approval_status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({submissions.filter(s => s.approval_status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="not_required">No Approval ({submissions.filter(s => !s.approval_status || s.approval_status === 'not_required').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No submissions match this filter.</TableCell></TableRow>
            ) : filtered.map((s) => {
              const p = profiles[s.user_id] || {};
              const isPending = s.approval_status === 'pending';
              const isDeciding = deciding === s.id;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{p.full_name || p.email || s.user_id}</div>
                    {s.approver_note && (
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={s.approver_note}>
                        Note: {s.approver_note}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><code className="text-xs">{s.period_key?.slice(0, 19).replace('T', ' ')}</code></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(s.submitted_at).toLocaleString()}</TableCell>
                  <TableCell><ApprovalBadge status={s.approval_status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                            disabled={isDeciding}
                            onClick={() => handleApprove(s)}
                          >
                            {isDeciding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={isDeciding}
                            onClick={() => { setRejectTarget(s); setRejectNote(''); }}
                          >
                            <X className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView(s)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View submission dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Response Details
              <ApprovalBadge status={view?.approval_status} />
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3">
              {view.approver_note && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <span className="font-medium">Approver note:</span> {view.approver_note}
                </div>
              )}
              {fields.map((f) => (
                <div key={f.id} className="border-b pb-2">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-medium">
                    {(() => {
                      const v = view.answers?.[f.field_key];
                      if (v === undefined || v === null || v === '') return <span className="text-muted-foreground italic">—</span>;
                      if (Array.isArray(v)) return v.join(', ');
                      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                      return String(v);
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-4 w-4 text-destructive" /> Reject Submission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason so the submitter knows what to improve.
            </p>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Missing required details in the activity description…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNote(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim() || !!deciding}
              onClick={handleRejectConfirm}
            >
              {deciding ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Rejecting…</> : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSFormSubmissions;
