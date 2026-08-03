import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import RichTextEditor from '@/components/RichTextEditor';
import DOMPurify from 'dompurify';
import {
  Send, Users, Search, X, CheckCircle2, Loader2, Mail,
  Eye, ChevronDown, ChevronUp, AlertCircle, Clock, Hash,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── types ────────────────────────────────────────────────────────────────────

interface Recipient {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface BroadcastLog {
  id: string;
  subject: string;
  audience: any;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

type AudienceType = 'all' | 'role' | 'capability' | 'custom';

const ROLES = [
  { value: 'admin',     label: 'Admins' },
  { value: 'employee',  label: 'Employees' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'guest',     label: 'Guests' },
];

const SENDER_LABELS = [
  { value: 'Footprints Dynasty Team',    label: 'Footprints Dynasty Team' },
  { value: 'HR Team',                    label: 'HR Team' },
  { value: 'Finance Team',              label: 'Finance Team' },
  { value: 'Management',                label: 'Management' },
  { value: 'IT & Platform Support',     label: 'IT & Platform Support' },
];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  sending:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function audienceLabel(audience: any): string {
  if (!audience) return '—';
  if (audience.type === 'all') return 'All platform users';
  if (audience.type === 'role') return `Role: ${audience.value}`;
  if (audience.type === 'capability') return `Capability: ${audience.value}`;
  if (audience.type === 'custom') return `${audience.user_ids?.length ?? 0} specific recipients`;
  return JSON.stringify(audience);
}

// ─── Recipient Preview Panel ──────────────────────────────────────────────────

function RecipientBadge({ r, onRemove }: { r: Recipient; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full bg-muted border text-xs">
      <Avatar className="h-4 w-4 shrink-0">
        <AvatarImage src={r.avatar_url ?? undefined} />
        <AvatarFallback className="text-[9px]">{initials(r.full_name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-[120px] truncate">{r.full_name || r.email || r.id.slice(0,8)}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BroadcastEmail() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (!authLoading && role && role !== 'admin') return <Navigate to="/dashboard" replace />;

  // ── Compose state ────────────────────────────────────────────────────────
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [senderLabel,  setSenderLabel]  = useState('Footprints Dynasty Team');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [roleValue,    setRoleValue]    = useState('employee');
  const [capValue,     setCapValue]     = useState('');
  const [capList,      setCapList]      = useState<string[]>([]);
  const [search,       setSearch]       = useState('');

  // Custom audience
  const [allUsers,      setAllUsers]      = useState<Recipient[]>([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [customPicked,  setCustomPicked]  = useState<Recipient[]>([]);

  // Preview dialog
  const [previewOpen,  setPreviewOpen]  = useState(false);

  // Sending
  const [sending,      setSending]      = useState(false);
  const [progress,     setProgress]     = useState({ done: 0, total: 0, failed: 0 });

  // History
  const [logs,         setLogs]         = useState<BroadcastLog[]>([]);
  const [loadingLogs,  setLoadingLogs]  = useState(false);
  const [logsOpen,     setLogsOpen]     = useState(false);

  // ── Load capabilities list for the capability picker ─────────────────────
  useEffect(() => {
    db.from('user_capabilities').select('capability')
      .then(({ data }) => {
        const unique = [...new Set((data || []).map((r: any) => r.capability))].sort();
        setCapList(unique);
        if (unique.length && !capValue) setCapValue(unique[0]);
      });
  }, []);

  // ── Load all users for custom picker ─────────────────────────────────────
  useEffect(() => {
    if (audienceType !== 'custom' || allUsers.length > 0) return;
    setLoadingUsers(true);
    // Fetch profiles + email via edge function (service-role required for auth.users)
    supabase.functions.invoke('get-users', { body: {} })
      .then(({ data, error }) => {
        if (error || !data?.users) {
          // Fallback: load profiles only (no email)
          db.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).order('full_name')
            .then(({ data: p }) => {
              setAllUsers((p || []).map((u: any) => ({ ...u, email: null, role: null })));
              setLoadingUsers(false);
            });
          return;
        }
        setAllUsers(data.users.map((u: any) => ({
          id:         u.id,
          full_name:  u.user_metadata?.full_name || u.email?.split('@')[0] || null,
          email:      u.email,
          avatar_url: u.user_metadata?.avatar_url || null,
          role:       null,
        })));
        setLoadingUsers(false);
      });
  }, [audienceType]);

  // ── Resolve recipients from audience ─────────────────────────────────────
  const resolveRecipients = async (): Promise<Recipient[]> => {
    if (audienceType === 'custom') return customPicked;

    if (audienceType === 'all') {
      // Use profiles + emails resolved inside the edge function per user_id
      const { data } = await db.from('profiles').select('id, full_name, avatar_url').eq('is_active', true);
      return (data || []).map((p: any) => ({ ...p, email: null, role: null }));
    }

    if (audienceType === 'role') {
      const { data: roles } = await db.from('user_roles').select('user_id').eq('role', roleValue);
      const ids = (roles || []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await db.from('profiles').select('id, full_name, avatar_url').in('id', ids).eq('is_active', true);
      return (profiles || []).map((p: any) => ({ ...p, email: null, role: roleValue }));
    }

    if (audienceType === 'capability') {
      const { data: caps } = await db.from('user_capabilities').select('user_id').eq('capability', capValue);
      const ids = (caps || []).map((c: any) => c.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await db.from('profiles').select('id, full_name, avatar_url').in('id', ids).eq('is_active', true);
      return (profiles || []).map((p: any) => ({ ...p, email: null, role: null }));
    }

    return [];
  };

  // ── Preview recipients ────────────────────────────────────────────────────
  const [previewRecipients, setPreviewRecipients] = useState<Recipient[]>([]);
  const [resolvingPreview, setResolvingPreview] = useState(false);

  const openPreview = async () => {
    if (!subject.trim()) { toast({ title: 'Subject is required', variant: 'destructive' }); return; }
    if (!body.trim() || body === '<p><br></p>') { toast({ title: 'Email body is empty', variant: 'destructive' }); return; }
    setResolvingPreview(true);
    const r = await resolveRecipients();
    setPreviewRecipients(r);
    setResolvingPreview(false);
    setPreviewOpen(true);
  };

  // ── Load broadcast history ────────────────────────────────────────────────
  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await db.from('broadcast_logs').select('*').order('created_at', { ascending: false }).limit(50);
    setLogs((data as BroadcastLog[]) || []);
    setLoadingLogs(false);
  };

  useEffect(() => { loadLogs(); }, []);

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const recipients = previewRecipients;
    if (!recipients.length) { toast({ title: 'No recipients found', variant: 'destructive' }); return; }

    setSending(true);
    setPreviewOpen(false);
    setProgress({ done: 0, total: recipients.length, failed: 0 });

    // Insert broadcast log
    const audience =
      audienceType === 'custom' ? { type: 'custom', user_ids: recipients.map(r => r.id) } :
      audienceType === 'role'   ? { type: 'role', value: roleValue } :
      audienceType === 'capability' ? { type: 'capability', value: capValue } :
      { type: 'all' };

    const { data: logData } = await db.from('broadcast_logs').insert({
      subject,
      audience,
      recipient_count: recipients.length,
      status: 'sending',
      sent_by: user?.id,
    }).select('id').single();

    const logId = (logData as any)?.id;

    let sent = 0;
    let failed = 0;

    // Send in batches of 5 to avoid edge-function rate limits
    const BATCH = 5;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (r) => {
        try {
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              template_key: 'broadcast',
              user_id: r.id,
              to: r.email || undefined,
              name: r.full_name || undefined,
              vars: {
                subject,
                html_body: DOMPurify.sanitize(body, { ADD_ATTR: ['target','rel','style'] }),
                sender_label: senderLabel,
                name: r.full_name || undefined,
              },
            },
          });
          if (error) throw error;
          sent++;
        } catch {
          failed++;
        }
        setProgress({ done: sent + failed, total: recipients.length, failed });
      }));
    }

    // Update broadcast log
    if (logId) {
      await db.from('broadcast_logs').update({
        sent_count:    sent,
        failed_count:  failed,
        status:        failed === recipients.length ? 'failed' : failed > 0 ? 'partial' : 'completed',
        completed_at:  new Date().toISOString(),
      }).eq('id', logId);
    }

    setSending(false);
    toast({
      title: `Broadcast complete`,
      description: `${sent} sent · ${failed} failed out of ${recipients.length} recipients`,
      variant: failed === recipients.length ? 'destructive' : 'default',
    });

    // Reset compose
    setSubject('');
    setBody('');
    setCustomPicked([]);
    loadLogs();
  };

  // ── Filtered user list for custom picker ─────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(u =>
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    ).filter(u => !customPicked.some(p => p.id === u.id));
  }, [allUsers, search, customPicked]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Broadcast Email">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Broadcast Email</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Send a branded email to platform users by role, capability, or custom list.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setLogsOpen(v => !v); if (!logsOpen) loadLogs(); }}
            className="gap-1.5">
            <Clock className="h-4 w-4" />
            {logsOpen ? 'Hide History' : 'Sent History'}
          </Button>
        </div>

        {/* ── Sending progress ── */}
        {sending && (
          <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-900/10">
            <CardContent className="py-4 px-5 flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Sending… {progress.done} / {progress.total}
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-blue-200 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
                {progress.failed > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">{progress.failed} failed</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Sent history ── */}
        {logsOpen && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" /> Broadcast History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No broadcasts sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{log.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {audienceLabel(log.audience)} · {log.recipient_count} recipients ·{' '}
                          {format(parseISO(log.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {log.status}
                        </span>
                        <span className="text-muted-foreground">
                          {log.sent_count}✓ {log.failed_count > 0 && `${log.failed_count}✗`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* ── Compose form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Audience + Settings ── */}
          <div className="space-y-5">

            {/* Audience */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" /> Audience
                </CardTitle>
                <CardDescription className="text-xs">Who should receive this email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Target type</Label>
                  <Select value={audienceType} onValueChange={v => setAudienceType(v as AudienceType)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All active users</SelectItem>
                      <SelectItem value="role">By role</SelectItem>
                      <SelectItem value="capability">By capability</SelectItem>
                      <SelectItem value="custom">Custom list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audienceType === 'role' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={roleValue} onValueChange={setRoleValue}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audienceType === 'capability' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Capability</Label>
                    <Select value={capValue} onValueChange={setCapValue}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {capList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audienceType === 'custom' && (
                  <div className="space-y-2">
                    {/* Selected */}
                    {customPicked.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {customPicked.map(r => (
                          <RecipientBadge key={r.id} r={r} onRemove={() => setCustomPicked(p => p.filter(x => x.id !== r.id))} />
                        ))}
                      </div>
                    )}
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input className="pl-8 h-8 text-xs" placeholder="Search users…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {loadingUsers ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                        {filteredUsers.slice(0, 30).map(u => (
                          <button key={u.id} type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left transition-colors"
                            onClick={() => setCustomPicked(p => [...p, u])}>
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[9px]">{initials(u.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{u.full_name || u.email || u.id.slice(0,8)}</p>
                              {u.email && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
                            </div>
                          </button>
                        ))}
                        {filteredUsers.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">No results</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {customPicked.length} recipient{customPicked.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sender label */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Sender Name</CardTitle>
                <CardDescription className="text-xs">Shown at the bottom of the email</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={senderLabel} onValueChange={setSenderLabel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENDER_LABELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

          </div>

          {/* ── Right: Subject + Body ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground" /> Compose
                </CardTitle>
                <CardDescription className="text-xs">
                  Company-branded email — your content is wrapped in the Footprints Dynasty template automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Important Update from Footprints Dynasty"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Body <span className="text-destructive">*</span></Label>
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    minHeight={320}
                    placeholder="Write your message here. HTML formatting is supported."
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports bold, italic, headings, lists, links, images, and colours.
                    The email is automatically wrapped in the company-branded template.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={openPreview}
                    disabled={resolvingPreview || sending}
                    className="gap-1.5"
                  >
                    {resolvingPreview
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Eye className="h-4 w-4" />}
                    Preview & Send
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Review recipients and email before sending.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ══ Preview & Confirm Dialog ══════════════════════════════════════════ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">Preview & Confirm Broadcast</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="text-xl font-bold text-foreground flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-primary" />
                  {previewRecipients.length}
                </p>
                <p className="text-xs text-muted-foreground">{audienceLabel({ type: audienceType, value: audienceType === 'role' ? roleValue : capValue })}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground">{senderLabel}</p>
                <p className="text-xs text-muted-foreground">hello@footprintsdynasty.com.ng</p>
              </div>
            </div>

            {/* Subject */}
            <div className="p-3 rounded-lg border bg-muted/20">
              <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
              <p className="text-sm font-medium text-foreground">{subject}</p>
            </div>

            {/* Recipient list */}
            {previewRecipients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Recipients ({Math.min(previewRecipients.length, 10)} shown{previewRecipients.length > 10 ? ` of ${previewRecipients.length}` : ''})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewRecipients.slice(0, 10).map(r => (
                    <RecipientBadge key={r.id} r={r} />
                  ))}
                  {previewRecipients.length > 10 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{previewRecipients.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {previewRecipients.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">No recipients found for this audience. Please adjust your selection.</p>
              </div>
            )}

            {/* Body preview */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Email body preview</p>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-white text-neutral-900 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Back to Compose</Button>
            <Button
              onClick={send}
              disabled={previewRecipients.length === 0}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              Send to {previewRecipients.length} recipient{previewRecipients.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
