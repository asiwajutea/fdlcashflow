import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, Eye, FileText, ExternalLink, Brain, Calendar, Upload,
  Loader2, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, AlertTriangle, X, CheckCircle2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ScreeningViewDialog from '@/components/hr/ScreeningViewDialog';
import InterviewScheduleDialog from '@/components/hr/InterviewScheduleDialog';
import ContractUploadDialog from '@/components/hr/ContractUploadDialog';

interface ApplicationRow {
  id: string;
  cover_letter: string | null;
  status: string;
  applied_at: string;
  updated_at?: string | null;
  candidate: {
    id: string; phone: string | null; education: string | null;
    experience_summary: string | null; resume_url: string | null; user_id: string;
  };
  job: { id: string; title: string; department: string; description: string; requirements: string; };
  candidate_name: string | null;
  candidate_avatar?: string | null;
  screening_score?: number | null;
}

const STATUS_OPTIONS = ['submitted', 'screening', 'interview', 'offered', 'hired', 'rejected'];
const PAGE_SIZE = 25;

// How many days in a stage before flagging as stale
const STALE_DAYS: Record<string, number> = {
  submitted: 3, screening: 5, interview: 7, offered: 5,
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'hired': return 'default';
    case 'rejected': return 'destructive';
    case 'interview': case 'offered': return 'secondary';
    default: return 'outline';
  }
};

const statusColor: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-700 border-blue-200',
  screening: 'bg-amber-500/10 text-amber-700 border-amber-200',
  interview: 'bg-purple-500/10 text-purple-700 border-purple-200',
  offered: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  hired: 'bg-green-500/10 text-green-700 border-green-200',
  rejected: 'bg-red-500/10 text-red-600 border-red-200',
};

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function isStale(app: ApplicationRow) {
  const limit = STALE_DAYS[app.status];
  if (!limit) return false;
  return daysAgo(app.applied_at) > limit;
}

const STAGE_MESSAGES: Record<string, { subject: string; body: (j: string, appId: string) => string }> = {
  screening: {
    subject: 'Your application has moved to Screening',
    body: (j, appId) => `Dear Candidate,\n\nGreat news! Your application for the "${j}" position has been selected for screening.\n\nYour next step is to complete the screening questionnaire. Please follow the link below to get started:\n\n👉 Complete Screening: ${window.location.origin}/screening?applicationId=${appId}\n\nPlease complete this at your earliest convenience — it is an important step in our evaluation process.\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  interview: {
    subject: 'Interview Scheduled — Congratulations!',
    body: (j, _appId) => `Dear Candidate,\n\nCongratulations! You've been shortlisted for an interview for the "${j}" position.\n\nYour next step is to check your interview details and confirm your availability:\n\n👉 View Interview Details: ${window.location.origin}/interviews\n\nPlease make sure you are available at the scheduled time. We look forward to meeting you!\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  offered: {
    subject: 'Job Offer Extended — Action Required',
    body: (j, _appId) => `Dear Candidate,\n\nWe are pleased to extend an offer for the "${j}" position!\n\nYour next step is to review and sign your contract:\n\n👉 Review & Sign Contract: ${window.location.origin}/offers\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  hired: {
    subject: 'Welcome to the Team! 🎉',
    body: (j, _appId) => `Dear Colleague,\n\nWelcome aboard! You've been officially hired for the "${j}" position.\n\nWe're excited to have you join our team at Footprints Dynasty Limited. Further onboarding details will be shared with you shortly.\n\nYou can view your dashboard here:\n👉 ${window.location.origin}/dashboard\n\nCongratulations!\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
};

type SortField = 'applied_at' | 'candidate_name' | 'job_title' | 'status' | 'screening_score';
type SortDir = 'asc' | 'desc';

const Applications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading, hasCapability } = useAuth();

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [screeningAppId, setScreeningAppId] = useState<string | null>(null);
  const [interviewAppId, setInterviewAppId] = useState<string | null>(null);
  const [contractAppId, setContractAppId] = useState<string | null>(null);
  const [generatingScreening, setGeneratingScreening] = useState<string | null>(null);
  const [hasScreeningData, setHasScreeningData] = useState<Set<string>>(new Set());
  // Track which apps have screening answers submitted by candidate
  const [screeningAnswered, setScreeningAnswered] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('applied_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const canManageRecruitment = role === 'admin' || hasCapability('manage_recruitment');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && user && !canManageRecruitment) navigate('/dashboard');
  }, [user, authLoading, canManageRecruitment, navigate]);

  useEffect(() => { if (canManageRecruitment) fetchApplications(); }, [canManageRecruitment]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, filterStatus, filterDept, sortField, sortDir]);

  const fetchApplications = async () => {
    const { data, error } = await (supabase as any)
      .from('applications')
      .select(`id, cover_letter, status, applied_at, updated_at,
        candidates!inner(id, phone, education, experience_summary, resume_url, user_id),
        job_positions!inner(id, title, department, description, requirements)`)
      .order('applied_at', { ascending: false });

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setLoading(false); return; }

    const userIds = [...new Set((data || []).map((a: any) => a.candidates.user_id))];
    const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name, avatar_url').in('id', userIds);
    const profileMap = new Map(profiles?.map((p: any) => [p.id, { name: p.full_name, avatar: p.avatar_url }]) || []);

    const appIds = (data || []).map((a: any) => a.id);
    let scoreMap = new Map<string, number | null>();
    let screeningSet = new Set<string>();
    let answeredSet = new Set<string>();
    if (appIds.length > 0) {
      const { data: sd } = await (supabase as any).from('screening_responses').select('application_id, score, responses').in('application_id', appIds);
      scoreMap = new Map(sd?.map((s: any) => [s.application_id, s.score]) || []);
      screeningSet = new Set(sd?.map((s: any) => s.application_id) || []);
      answeredSet = new Set(
        (sd || [])
          .filter((s: any) => { const ans = s.responses?.answers; return ans && Object.keys(ans).length > 0; })
          .map((s: any) => s.application_id)
      );
    }

    const mapped: ApplicationRow[] = (data || []).map((a: any) => {
      const prof = profileMap.get(a.candidates.user_id);
      return {
        id: a.id, cover_letter: a.cover_letter, status: a.status, applied_at: a.applied_at, updated_at: a.updated_at || null,
        candidate: a.candidates, job: a.job_positions,
        candidate_name: prof?.name || 'Unknown',
        candidate_avatar: prof?.avatar || null,
        screening_score: scoreMap.get(a.id) ?? null,
      };
    });
    setHasScreeningData(screeningSet);
    setScreeningAnswered(answeredSet);
    setApplications(mapped);
    setLoading(false);
  };

  // Derived filter/sort/paginate
  const departments = useMemo(() => [...new Set(applications.map(a => a.job.department).filter(Boolean))].sort(), [applications]);

  const filtered = useMemo(() => {
    let list = [...applications];
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
    if (filterDept !== 'all') list = list.filter(a => a.job.department === filterDept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.candidate_name || '').toLowerCase().includes(q) ||
        a.job.title.toLowerCase().includes(q) ||
        a.job.department.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'applied_at': cmp = new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime(); break;
        case 'candidate_name': cmp = (a.candidate_name || '').localeCompare(b.candidate_name || ''); break;
        case 'job_title': cmp = a.job.title.localeCompare(b.job.title); break;
        case 'status': cmp = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status); break;
        case 'screening_score': cmp = (a.screening_score ?? -1) - (b.screening_score ?? -1); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [applications, filterStatus, filterDept, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Pipeline counts
  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_OPTIONS.forEach(s => { counts[s] = applications.filter(a => a.status === s).length; });
    return counts;
  }, [applications]);

  const staleCount = useMemo(() => applications.filter(isStale).length, [applications]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'applied_at' ? 'desc' : 'asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  // Bulk selection helpers
  const allPageSelected = paginated.length > 0 && paginated.every(a => selected.has(a.id));
  const toggleAll = () => {
    if (allPageSelected) setSelected(prev => { const n = new Set(prev); paginated.forEach(a => n.delete(a.id)); return n; });
    else setSelected(prev => { const n = new Set(prev); paginated.forEach(a => n.add(a.id)); return n; });
  };
  const toggleOne = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkUpdating(true);
    const ids = [...selected];
    const { error } = await (supabase as any).from('applications').update({ status: bulkStatus }).in('id', ids);
    if (error) { toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' }); }
    else {
      setApplications(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: bulkStatus } : a));
      toast({ title: 'Bulk Update', description: `${ids.length} application${ids.length !== 1 ? 's' : ''} moved to "${bulkStatus}"` });
      setSelected(new Set());
      setBulkStatus('');
    }
    setBulkUpdating(false);
  };

  const triggerScreeningGeneration = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    setGeneratingScreening(appId);
    try {
      const { data: template } = await (supabase as any).from('job_screening_templates').select('questions').eq('job_id', app.job.id).maybeSingle();
      let questions: any[];
      if (template?.questions?.length > 0) {
        questions = template.questions;
      } else {
        const { data, error } = await supabase.functions.invoke('generate-screening', {
          body: { job_title: app.job.title, department: app.job.department, description: app.job.description, requirements: app.job.requirements },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        questions = data.questions;
      }
      await (supabase as any).from('screening_responses').upsert(
        { application_id: appId, responses: { questions, answers: {}, generated_at: new Date().toISOString() } },
        { onConflict: 'application_id' }
      );
      setHasScreeningData(prev => new Set([...prev, appId]));
      toast({ title: 'Screening Generated', description: 'Screening questions sent to candidate.' });
    } catch (e: any) {
      toast({ title: 'Screening Error', description: e.message || 'Failed to generate screening questions', variant: 'destructive' });
    } finally { setGeneratingScreening(null); }
  };

  const sendStageMessage = async (app: ApplicationRow, newStatus: string) => {
    const tpl = STAGE_MESSAGES[newStatus];
    if (!tpl || !user) return;
    try {
      // Inbox message
      await (supabase as any).from('messages').insert({ sender_id: user.id, recipient_id: app.candidate.user_id, subject: tpl.subject, body: tpl.body(app.job.title, app.id) });
      // Email notification — fire and forget
      const { data: prof } = await (supabase as any).from('profiles').select('full_name, email').eq('id', app.candidate.user_id).maybeSingle();
      const email = prof?.email;
      if (email) {
        const emailKeyMap: Record<string, string> = { screening: 'candidate_screening', interview: 'candidate_interview', offered: 'candidate_offered', hired: 'candidate_hired', rejected: 'candidate_rejected' };
        const emailKey = emailKeyMap[newStatus];
        if (emailKey) {
          supabase.functions.invoke('send-email', {
            body: { template_key: emailKey, to: email, name: (prof?.full_name || 'Candidate').split(' ')[0], user_id: app.candidate.user_id, vars: { job: app.job.title, applicationId: app.id, origin: window.location.origin } },
          }).catch(e => console.error('stage email failed', e));
        }
      }
    } catch (e) { console.error('Failed to send stage message:', e); }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const app = applications.find(a => a.id === appId);
    const { error } = await (supabase as any).from('applications').update({ status: newStatus }).eq('id', appId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Status Updated', description: `Application moved to "${newStatus}"` });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a));
    if (app) {
      sendStageMessage(app, newStatus);
      try {
        const { data: prof } = await (supabase as any).from('profiles').select('full_name, phone').eq('id', app.candidate.user_id).maybeSingle();
        if (prof?.phone) {
          supabase.functions.invoke('send-sms', {
            body: {
              to: prof.phone,
              user_id: app.candidate.user_id,
              template_key: newStatus === 'hired' ? 'candidate_hire'
                          : newStatus === 'rejected' ? 'candidate_reject'
                          : newStatus === 'offered' ? 'candidate_offer'
                          : 'candidate_stage',
              vars: { name: (prof.full_name || 'there').split(' ')[0], job: app.job.title, stage: newStatus, position: app.job.title, link: `${window.location.origin}/offers` },
            },
          }).catch(() => {});
        } else {
          toast({ title: 'SMS Skipped', description: `${app.candidate_name || 'Candidate'} has no phone number — SMS not sent.`, variant: 'destructive' });
        }
      } catch (e) { console.error('sms', e); }
    }
    if (newStatus === 'screening') triggerScreeningGeneration(appId);
    if (newStatus === 'hired') {
      try {
        const { error: pe } = await supabase.functions.invoke('promote-candidate-to-employee', { body: { application_id: appId } });
        if (pe) throw pe;
        toast({ title: 'Promoted to Employee', description: 'Candidate role updated.' });
      } catch (e: any) { toast({ title: 'Promotion Failed', description: e.message || 'Could not promote', variant: 'destructive' }); }
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Applications">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  return (
    <TooltipProvider>
    <DashboardLayout title="HR Applications Dashboard">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Applications
            </h2>
            <p className="text-sm text-muted-foreground">
              {applications.length} total · sorted newest first
              {staleCount > 0 && <span className="ml-2 text-amber-600 font-medium flex items-center gap-1 inline-flex"><AlertTriangle className="h-3.5 w-3.5" /> {staleCount} stale</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>View Job Listings</Button>
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { setFilterStatus(filterStatus === s ? 'all' : s); }}
              className={`rounded-lg border p-2.5 text-center transition-all hover:shadow-sm ${filterStatus === s ? 'ring-2 ring-primary' : ''} ${statusColor[s]}`}>
              <p className="text-xl font-bold">{pipeline[s] ?? 0}</p>
              <p className="text-[11px] capitalize font-medium">{s}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate, position…" className="pl-9 h-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterDept !== 'all' || search) && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterDept('all'); }}>
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 flex-wrap">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Move to…" /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" disabled={!bulkStatus || bulkUpdating} onClick={handleBulkStatus} className="h-8">
              {bulkUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Apply
            </Button>
            <Button size="sm" variant="ghost" className="h-8 ml-auto" onClick={() => setSelected(new Set())}>Deselect all</Button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No applications found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10"><Checkbox checked={allPageSelected} onCheckedChange={toggleAll} aria-label="Select all on page" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('candidate_name')}>
                    <span className="flex items-center">Candidate <SortIcon field="candidate_name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('job_title')}>
                    <span className="flex items-center">Position <SortIcon field="job_title" /></span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <span className="flex items-center">Status <SortIcon field="status" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('screening_score')}>
                    <span className="flex items-center">Score <SortIcon field="screening_score" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('applied_at')}>
                    <span className="flex items-center">Applied <SortIcon field="applied_at" /></span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((app) => {
                  const days = daysAgo(app.applied_at);
                  const stale = isStale(app);
                  return (
                    <TableRow key={app.id} className={selected.has(app.id) ? 'bg-primary/5' : stale ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                      <TableCell><Checkbox checked={selected.has(app.id)} onCheckedChange={() => toggleOne(app.id)} aria-label={`Select ${app.candidate_name}`} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={app.candidate_avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {(app.candidate_name || '?').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{app.candidate_name}</span>
                          {stale && <Tooltip><TooltipTrigger><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></TooltipTrigger><TooltipContent>Stale — {days}d in {app.status}</TooltipContent></Tooltip>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{app.job.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{app.job.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                              <SelectTrigger className="w-[120px] h-7 text-xs border-0 p-0 shadow-none focus:ring-0">
                                <Badge className={`text-xs font-medium border capitalize ${statusColor[app.status]}`}>{app.status}</Badge>
                              </SelectTrigger>
                              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                            </Select>
                            {generatingScreening === app.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                          </div>
                          {app.updated_at && (
                            <span className="text-[10px] text-muted-foreground/70 pl-0.5">
                              {new Date(app.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          {app.screening_score != null
                            ? <Badge variant="secondary" className="text-xs">{app.screening_score}/100</Badge>
                            : screeningAnswered.has(app.id)
                              ? <Tooltip><TooltipTrigger><Badge variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"><CheckCircle2 className="h-3 w-3" />Answered</Badge></TooltipTrigger><TooltipContent>Candidate has submitted screening answers — awaiting score</TooltipContent></Tooltip>
                              : hasScreeningData.has(app.id)
                                ? <span className="text-xs text-amber-600">Pending</span>
                                : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div>{new Date(app.applied_at).toLocaleDateString()}</div>
                        <div className="text-[10px] mt-0.5 text-muted-foreground/70">{days === 0 ? 'Today' : `${days}d ago`}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSelectedApp(app); setDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>View details</TooltipContent></Tooltip>
                          {(app.status === 'screening' || app.screening_score != null) && (
                            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScreeningAppId(app.id)}><Brain className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>View screening</TooltipContent></Tooltip>
                          )}
                          {app.status === 'screening' && !hasScreeningData.has(app.id) && (
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:text-amber-700" onClick={() => triggerScreeningGeneration(app.id)} disabled={generatingScreening === app.id}>
                                {generatingScreening === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              </Button></TooltipTrigger><TooltipContent>Generate screening questions</TooltipContent></Tooltip>
                          )}
                          {app.status === 'interview' && (
                            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setInterviewAppId(app.id)}><Calendar className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Manage interview</TooltipContent></Tooltip>
                          )}
                          {app.status === 'offered' && (
                            <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setContractAppId(app.id)}><Upload className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Manage contract</TooltipContent></Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(1)}><ChevronLeft className="h-3.5 w-3.5" /><ChevronLeft className="h-3.5 w-3.5 -ml-2" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <Button key={p} size="icon" variant={p === page ? 'default' : 'outline'} className="h-8 w-8 text-xs" onClick={() => setPage(p)}>{p}</Button>
                );
              })}
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronRight className="h-3.5 w-3.5" /><ChevronRight className="h-3.5 w-3.5 -ml-2" /></Button>
            </div>
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
            {selectedApp && (
              <div className="space-y-4">
                {/* Candidate profile header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={selectedApp.candidate_avatar || undefined} />
                    <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                      {(selectedApp.candidate_name || '?').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{selectedApp.candidate_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{selectedApp.job.title} · {selectedApp.job.department}</p>
                    <Badge className={`mt-1 text-xs capitalize border ${statusColor[selectedApp.status]}`}>{selectedApp.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['Phone', selectedApp.candidate.phone || 'N/A'], ['Education', selectedApp.candidate.education || 'N/A'], ['Applied', new Date(selectedApp.applied_at).toLocaleDateString()]].map(([label, val]) => (
                    <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{val}</p></div>
                  ))}
                  {/* Screening status */}
                  <div>
                    <p className="text-xs text-muted-foreground">Screening</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {selectedApp.screening_score != null
                        ? <><Badge variant="secondary" className="text-xs">{selectedApp.screening_score}/100</Badge></>
                        : screeningAnswered.has(selectedApp.id)
                          ? <span className="flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Answered</span>
                          : hasScreeningData.has(selectedApp.id)
                            ? <span className="text-amber-600 text-xs">Awaiting answers</span>
                            : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </p>
                  </div>
                </div>
                {selectedApp.candidate.experience_summary && <div><p className="text-xs text-muted-foreground mb-1">Experience</p><p className="text-sm">{selectedApp.candidate.experience_summary}</p></div>}
                {selectedApp.cover_letter && <div><p className="text-xs text-muted-foreground mb-1">Cover Letter</p><p className="text-sm whitespace-pre-wrap">{selectedApp.cover_letter}</p></div>}
                {selectedApp.candidate.resume_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedApp.candidate.resume_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> View Resume</a>
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ScreeningViewDialog applicationId={screeningAppId} open={!!screeningAppId} onOpenChange={(o) => !o && setScreeningAppId(null)} onScored={fetchApplications} />
        <InterviewScheduleDialog applicationId={interviewAppId} open={!!interviewAppId} onOpenChange={(o) => !o && setInterviewAppId(null)} onSaved={fetchApplications} />
        <ContractUploadDialog applicationId={contractAppId} open={!!contractAppId} onOpenChange={(o) => !o && setContractAppId(null)} onSaved={fetchApplications} />
      </div>
    </DashboardLayout>
    </TooltipProvider>
  );
};

export default Applications;
