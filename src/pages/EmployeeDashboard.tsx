import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import {
  User, CalendarClock, Briefcase, Mail, Receipt, BarChart3,
  Wallet, MessageSquare, BookOpen, LifeBuoy, ArrowRight,
  AlertCircle, CheckCircle2, FileSignature, UserCircle2, Users, Phone,
  Trophy, Star, Clock, ChevronRight, Activity, Bell,
} from 'lucide-react';
import { useIsLeader } from '@/hooks/useIsLeader';

interface ManagerInfo {
  id: string; full_name: string | null; avatar_url: string | null;
  about_me: string | null; about_me_excerpt: string | null;
  about_details: Record<string, any> | null; about_visibility: Record<string, boolean> | null;
  position_name?: string | null; designation?: string | null;
  email?: string | null; phone?: string | null;
}

const getVisibleAboutEntries = (m: ManagerInfo | null): [string, string][] => {
  if (!m) return [];
  const v = m.about_visibility || {};
  return Object.entries(m.about_details || {}).filter(([k, val]) => !!val && v[k] !== false) as [string, string][];
};
const managerHasIntro = (m: ManagerInfo | null) =>
  !!m && (!!(m.about_me || m.about_me_excerpt) || getVisibleAboutEntries(m).length > 0);

const periodKey = (frequency: string) => {
  const now = new Date();
  if (frequency === 'daily') return now.toISOString().slice(0, 10);
  if (frequency === 'weekly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((Math.floor((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') return now.toISOString().slice(0, 7);
  return 'once';
};

interface ActionItem {
  id: string; icon: any; label: string; detail: string;
  cta: string; path: string; severity: 'high' | 'medium' | 'low';
}

// ── Nav groups shown on dashboard ───────────────────────────────────────────
const NAV_GROUPS = [
  {
    id: 'work', label: 'My Work', color: 'bg-blue-500/10 text-blue-600',
    links: [
      { path: '/daily-tracker', label: 'Daily Tracker', icon: CalendarClock },
      { path: '/activity-report', label: 'Activity Report', icon: BarChart3 },
      { path: '/my-invoices', label: 'My Payslips', icon: Receipt },
      { path: '/my-finance', label: 'Finance', icon: Wallet },
    ],
  },
  {
    id: 'comms', label: 'Communication', color: 'bg-purple-500/10 text-purple-600',
    links: [
      { path: '/inbox', label: 'Inbox', icon: Mail },
      { path: '/suggestions', label: 'Suggestions', icon: MessageSquare },
    ],
  },
  {
    id: 'career', label: 'Career', color: 'bg-emerald-500/10 text-emerald-600',
    links: [
      { path: '/profile', label: 'My Profile', icon: User },
      { path: '/jobs', label: 'Job Openings', icon: Briefcase },
    ],
  },
  {
    id: 'resources', label: 'Resources', color: 'bg-amber-500/10 text-amber-600',
    links: [
      { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
      { path: '/employee-support', label: 'Employee Support', icon: LifeBuoy },
    ],
  },
];

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, fullName, avatarUrl } = useAuth();
  const { isLeader, subordinateIds } = useIsLeader();

  const [unread, setUnread] = useState(0);
  const [openJobs, setOpenJobs] = useState(0);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [positionName, setPositionName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [introNagOpen, setIntroNagOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  // Today section data
  const [todayBirthdays, setTodayBirthdays] = useState<{ name: string; avatar: string | null }[]>([]);
  const [dueForms, setDueForms] = useState<string[]>([]);

  // Team leads data
  const [teamLeads, setTeamLeads] = useState<{ id: string; name: string; avatar: string | null; role: string }[]>([]);

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<{ id: string; text: string; time: string; icon: any }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: msgCount }, { count: jobCount }, profileRes, formsRes, subsRes] = await Promise.all([
        (supabase as any).from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false),
        (supabase as any).from('job_positions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        (supabase as any).from('profiles').select('*').eq('id', user.id).maybeSingle(),
        db.from('activity_forms').select('id,title,frequency').eq('is_active', true),
        db.from('activity_form_submissions').select('form_id,period_key').eq('user_id', user.id),
      ]);

      setUnread(msgCount || 0);
      setOpenJobs(jobCount || 0);

      const list: ActionItem[] = [];
      const profile = profileRes.data;
      const forms = (formsRes as any).data || [];
      const subs = (subsRes as any).data || [];

      if (profile) {
        const [posRes, deptRes, mgrRes] = await Promise.all([
          profile.position_id ? db.from('positions').select('name').eq('id', profile.position_id).maybeSingle() : Promise.resolve({ data: null }),
          profile.department_id ? db.from('departments').select('name').eq('id', profile.department_id).maybeSingle() : Promise.resolve({ data: null }),
          (supabase as any).rpc('get_my_manager'),
        ]);
        if (posRes.data) setPositionName(posRes.data.name);
        if (deptRes.data) setDepartmentName(deptRes.data.name);
        const mgrRow = Array.isArray(mgrRes.data) ? mgrRes.data[0] : mgrRes.data;
        if (mgrRow) {
          setManagerName(mgrRow.full_name);
          const mgrInfo: ManagerInfo = { ...mgrRow, position_name: mgrRow.position_name ?? null };
          setManager(mgrInfo);
          if (managerHasIntro(mgrInfo) && profile.manager_intro_acknowledged !== true) setIntroNagOpen(true);
        }

        const gaps: string[] = [];
        if (!profile.avatar_url && !avatarUrl) gaps.push('photo');
        if (!profile.phone) gaps.push('phone');
        if (!profile.bank_name || !profile.account_number) gaps.push('bank details');
        if (!profile.birthday) gaps.push('birthday');
        if (gaps.length) list.push({ id: 'profile', icon: UserCircle2, label: 'Complete your profile', detail: 'Missing: ' + gaps.join(', '), cta: 'Update', path: '/profile', severity: 'medium' });
      }

      const overdue = forms.filter((f: any) => !subs.some((s: any) => s.form_id === f.id && s.period_key === periodKey(f.frequency)));
      if (overdue.length) {
        list.push({ id: 'forms', icon: AlertCircle, label: `${overdue.length} activity form${overdue.length > 1 ? 's' : ''} due`, detail: overdue.slice(0, 2).map((f: any) => f.title).join(', ') + (overdue.length > 2 ? '…' : ''), cta: 'Submit now', path: '/activity-report', severity: 'high' });
        setDueForms(overdue.map((f: any) => f.title));
      }

      if (msgCount && msgCount > 0) list.push({ id: 'inbox', icon: Mail, label: `${msgCount} unread message${msgCount > 1 ? 's' : ''}`, detail: 'New messages in your inbox', cta: 'Read', path: '/inbox', severity: 'medium' });

      const { data: cands } = await (supabase as any).from('candidates').select('id').eq('user_id', user.id);
      if (cands?.length) {
        const { data: apps } = await (supabase as any).from('applications').select('id').in('candidate_id', cands.map((c: any) => c.id));
        if (apps?.length) {
          const { data: contracts } = await (supabase as any).from('contracts').select('id,signed_at').in('application_id', apps.map((a: any) => a.id));
          const unsigned = (contracts || []).filter((c: any) => !c.signed_at).length;
          if (unsigned > 0) list.push({ id: 'contract', icon: FileSignature, label: `${unsigned} contract${unsigned > 1 ? 's' : ''} awaiting signature`, detail: 'Sign to complete onboarding', cta: 'Sign', path: '/my-contract', severity: 'high' });
        }
      }

      setActions(list);

      // Today's birthdays
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      try {
        const { data: bdays } = await (supabase as any).from('profiles').select('full_name,avatar_url,birthday').not('birthday', 'is', null);
        const todayBdays = (bdays || []).filter((p: any) => {
          if (!p.birthday) return false;
          const parts = p.birthday.split('-');
          return parts[1] === mm && parts[2] === dd;
        });
        setTodayBirthdays(todayBdays.map((p: any) => ({ name: p.full_name || 'Team member', avatar: p.avatar_url })));
      } catch {}

      // Team leads (managers/leaders in the org)
      try {
        const { data: leads } = await (supabase as any).rpc('get_my_manager');
        if (leads) {
          const arr = Array.isArray(leads) ? leads : [leads];
          setTeamLeads(arr.filter(Boolean).map((l: any) => ({ id: l.id, name: l.full_name || 'Manager', avatar: l.avatar_url, role: l.position_name || l.designation || 'Manager' })));
        }
      } catch {}

      // Recent activity from form submissions
      try {
        const { data: recent } = await db.from('activity_form_submissions').select('id,submitted_at,activity_forms(title)').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(5);
        setRecentActivity((recent || []).map((r: any) => ({ id: r.id, text: `Submitted: ${(r.activity_forms as any)?.title || 'Activity Form'}`, time: r.submitted_at, icon: CheckCircle2 })));
      } catch {}
    })();
  }, [user, avatarUrl]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const severityClasses = { high: 'border-l-4 border-l-destructive', medium: 'border-l-4 border-l-orange-500', low: 'border-l-4 border-l-primary' };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 border-0">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{greeting}, {fullName || 'Team member'}! 👋</h2>
            <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
          </div>
          {(positionName || departmentName || managerName) && (
            <div className="flex flex-wrap gap-2">
              {positionName && <Badge variant="outline" className="bg-background/60 gap-1.5 py-1"><Briefcase className="h-3.5 w-3.5 text-primary" />{positionName}</Badge>}
              {departmentName && <Badge variant="outline" className="bg-background/60 gap-1.5 py-1"><Users className="h-3.5 w-3.5 text-primary" />{departmentName}</Badge>}
              {managerName && (
                <Badge variant="outline" className="bg-background/60 gap-1.5 py-1 cursor-pointer hover:bg-background" onClick={() => { if (!manager) return; managerHasIntro(manager) ? setIntroNagOpen(true) : setManagerDialogOpen(true); }}>
                  <UserCircle2 className="h-3.5 w-3.5 text-primary" />Manager: {managerName}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Action Required ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" /> Action Required
            {actions.length > 0 && <Badge variant="destructive">{actions.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-600" />
              <p>You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg bg-muted/40 ${severityClasses[a.severity]}`}>
                    <Icon className={`h-5 w-5 shrink-0 ${a.severity === 'high' ? 'text-destructive' : a.severity === 'medium' ? 'text-orange-500' : 'text-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(a.path)}>{a.cta}</Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3 stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/inbox')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Unread messages</p><p className="text-2xl font-bold">{unread}</p></div>
            <Mail className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/jobs')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Open job positions</p><p className="text-2xl font-bold">{openJobs}</p></div>
            <Briefcase className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Today</p><p className="text-lg font-semibold">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p></div>
            <CalendarClock className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      {/* ── Main content grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — navigation + team lead */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{group.label}</p>
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button key={link.path} onClick={() => navigate(link.path)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-accent/40 hover:border-primary/30 transition-all text-left group">
                        <div className={`p-1.5 rounded-md shrink-0 ${group.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{link.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Team Lead section */}
          {(isLeader || teamLeads.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Team Leads</CardTitle>
                  {isLeader && <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate('/team-reports')}>View reports <ChevronRight className="h-3.5 w-3.5" /></Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={lead.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{lead.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">Manager</Badge>
                  </div>
                ))}
                {isLeader && (
                  <button onClick={() => navigate('/team-reports')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed hover:border-primary/50 hover:bg-accent/20 transition-all group">
                    <div className="p-2 rounded-md bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">My Team</p>
                      <p className="text-xs text-muted-foreground">{subordinateIds.length} member{subordinateIds.length !== 1 ? 's' : ''} reporting to you</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Awards & Recognition — placeholder for future */}
          <Card className="border-dashed border-2 border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Trophy className="h-4 w-4" /> Awards & Recognition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Coming soon</p>
                <p className="text-xs text-muted-foreground max-w-xs">Employee awards and recognition will appear here — celebrating achievements, milestones, and team wins.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Today + Recent Activity */}
        <div className="space-y-6">

          {/* Today card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Birthday celebrations */}
              {todayBirthdays.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🎂 Birthdays</p>
                  {todayBirthdays.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={b.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-rose-100 text-rose-600">{b.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.name}</p>
                        <p className="text-[11px] text-rose-600">Happy Birthday! 🎉</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-base">🎂</span> No birthdays today
                </div>
              )}

              {/* Due forms */}
              {dueForms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📋 Due Forms</p>
                  {dueForms.slice(0, 3).map((f, i) => (
                    <button key={i} onClick={() => navigate('/activity-report')}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 hover:border-orange-400/50 transition-colors text-left group">
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{f}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-orange-500" />
                    </button>
                  ))}
                  {dueForms.length > 3 && <p className="text-xs text-muted-foreground text-center">+{dueForms.length - 3} more</p>}
                </div>
              )}

              {todayBirthdays.length === 0 && dueForms.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Nothing else scheduled for today.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate('/activity-report')}>View all <ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No recent activity yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="p-1.5 rounded-full bg-primary/10 shrink-0 mt-0.5"><Icon className="h-3 w-3 text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{a.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Manager modals ────────────────────────────────────────── */}
      <ManagerIntroModal open={introNagOpen} manager={manager} acknowledging={acknowledging}
        onViewMore={() => { setIntroNagOpen(false); setManagerDialogOpen(true); }}
        onAcknowledge={async () => {
          if (!user) return;
          setAcknowledging(true);
          await (supabase as any).from('profiles').update({ manager_intro_acknowledged: true }).eq('id', user.id);
          setAcknowledging(false);
          setIntroNagOpen(false);
        }}
      />
      <ManagerAboutDialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen} manager={manager} />
    </div>
  );
};

// ── Manager intro modal ──────────────────────────────────────────────────────
const ManagerIntroModal: React.FC<{
  open: boolean; manager: ManagerInfo | null; acknowledging: boolean;
  onViewMore: () => void; onAcknowledge: () => void;
}> = ({ open, manager, acknowledging, onViewMore, onAcknowledge }) => {
  if (!manager) return null;
  const introText = manager.about_me_excerpt || (manager.about_me ? manager.about_me.slice(0, 240) + (manager.about_me.length > 240 ? '…' : '') : '');
  const fallbackEntry = getVisibleAboutEntries(manager)[0];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onAcknowledge(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meet your direct manager</DialogTitle>
          <DialogDescription>A quick introduction from the person you'll be reporting to.</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={manager.avatar_url || undefined} />
            <AvatarFallback>{manager.full_name?.charAt(0) || 'M'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{manager.full_name}</p>
            {(manager.designation || manager.position_name) && <p className="text-xs text-muted-foreground">{manager.designation || manager.position_name}</p>}
            {introText ? (
              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{introText}</p>
            ) : fallbackEntry ? (
              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{fallbackEntry[0].replace(/_/g, ' ')}: </span>
                {String(fallbackEntry[1])}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No introduction provided.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onViewMore}>View full profile</Button>
          <Button onClick={onAcknowledge} disabled={acknowledging}>{acknowledging ? 'Saving…' : 'Got it, thanks'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Manager About Me dialog ──────────────────────────────────────────────────
const ManagerAboutDialog: React.FC<{
  open: boolean; onOpenChange: (o: boolean) => void; manager: ManagerInfo | null;
}> = ({ open, onOpenChange, manager }) => {
  if (!manager) return null;
  const aboutText = manager.about_me || manager.about_me_excerpt || '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={manager.avatar_url || undefined} />
              <AvatarFallback>{manager.full_name?.charAt(0) || 'M'}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{manager.full_name}</DialogTitle>
              {(manager.designation || manager.position_name) && <DialogDescription>{manager.designation || manager.position_name}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        {aboutText ? (
          <div><h4 className="text-sm font-semibold text-foreground mb-1">About</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aboutText}</p></div>
        ) : (
          <p className="text-sm text-muted-foreground">Your manager hasn't shared an About summary yet.</p>
        )}
        {(manager.email || manager.phone) && (
          <div className="mt-2 space-y-1.5 border-t pt-3">
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            {manager.email && <a href={`mailto:${manager.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{manager.email}</span></a>}
            {manager.phone && <a href={`tel:${manager.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="h-4 w-4 shrink-0 text-primary" /><span>{manager.phone}</span></a>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDashboard;
