import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import {
  CalendarClock, Briefcase, Mail, Receipt, BarChart3, Wallet,
  MessageSquare, BookOpen, LifeBuoy, AlertCircle, CheckCircle2,
  FileSignature, UserCircle2, Users, Phone, Trophy, Star,
  Clock, Activity, User, RefreshCw,
} from 'lucide-react';
import { useIsLeader } from '@/hooks/useIsLeader';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ManagerInfo {
  id: string; full_name: string | null; avatar_url: string | null;
  about_me: string | null; about_me_excerpt: string | null;
  about_details: Record<string, any> | null; about_visibility: Record<string, boolean> | null;
  position_name?: string | null; designation?: string | null;
  email?: string | null; phone?: string | null;
}
interface ActionItem {
  id: string; icon: any; label: string; detail: string;
  cta: string; path: string; severity: 'high' | 'medium' | 'low';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard',      label: 'Dashboard',      icon: BarChart3 },
  { path: '/activity-report',label: 'Activity Report', icon: Activity },
  { path: '/daily-tracker',  label: 'Daily Tracker',  icon: CalendarClock },
  { path: '/my-invoices',    label: 'My Payslips',    icon: Receipt },
  { path: '/my-finance',     label: 'Finance',        icon: Wallet },
  { path: '/inbox',          label: 'Inbox',          icon: Mail },
  { path: '/suggestions',    label: 'Suggestions',    icon: MessageSquare },
  { path: '/jobs',           label: 'Job Openings',   icon: Briefcase },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { path: '/employee-support',label: 'Support',       icon: LifeBuoy },
  { path: '/profile',        label: 'My Profile',     icon: User },
];

// ─── Main component ───────────────────────────────────────────────────────────
const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, fullName, avatarUrl } = useAuth();
  const { isLeader, subordinateIds } = useIsLeader();
  const currentPath = window.location.pathname;

  const [unread, setUnread]           = useState(0);
  const [openJobs, setOpenJobs]       = useState(0);
  const [actions, setActions]         = useState<ActionItem[]>([]);
  const [positionName, setPositionName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [manager, setManager]         = useState<ManagerInfo | null>(null);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [introNagOpen, setIntroNagOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState<{name:string;avatar:string|null}[]>([]);
  const [dueForms, setDueForms]       = useState<string[]>([]);
  const [teamLeads, setTeamLeads]     = useState<{id:string;name:string;avatar:string|null;role:string;email:string|null}[]>([]);
  const [recentActivity, setRecentActivity] = useState<{id:string;text:string;sub:string;time:string}[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: msgCount }, { count: jobCount }, profileRes, formsRes, subsRes] = await Promise.all([
        (supabase as any).from('messages').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).eq('is_read',false),
        (supabase as any).from('job_positions').select('*',{count:'exact',head:true}).eq('status','open'),
        (supabase as any).from('profiles').select('*').eq('id',user.id).maybeSingle(),
        db.from('activity_forms').select('id,title,frequency').eq('is_active',true),
        db.from('activity_form_submissions').select('form_id,period_key').eq('user_id',user.id),
      ]);
      setUnread(msgCount||0); setOpenJobs(jobCount||0);

      const profile = profileRes.data;
      const forms   = (formsRes as any).data||[];
      const subs    = (subsRes as any).data||[];
      const list: ActionItem[] = [];

      if (profile) {
        const [posRes, deptRes, mgrRes] = await Promise.all([
          profile.position_id ? db.from('positions').select('name').eq('id',profile.position_id).maybeSingle() : Promise.resolve({data:null}),
          profile.department_id ? db.from('departments').select('name').eq('id',profile.department_id).maybeSingle() : Promise.resolve({data:null}),
          (supabase as any).rpc('get_my_manager'),
        ]);
        if (posRes.data) setPositionName(posRes.data.name);
        if (deptRes.data) setDepartmentName(deptRes.data.name);
        const mgrRow = Array.isArray(mgrRes.data)?mgrRes.data[0]:mgrRes.data;
        if (mgrRow) {
          const mgrInfo: ManagerInfo = {...mgrRow, position_name: mgrRow.position_name??null};
          setManager(mgrInfo);
          setTeamLeads([{id:mgrRow.id,name:mgrRow.full_name||'Manager',avatar:mgrRow.avatar_url,role:mgrRow.position_name||mgrRow.designation||'Manager',email:mgrRow.email||null}]);
          if (managerHasIntro(mgrInfo) && profile.manager_intro_acknowledged!==true) setIntroNagOpen(true);
        }
        const gaps: string[] = [];
        if (!profile.avatar_url && !avatarUrl) gaps.push('photo');
        if (!profile.phone) gaps.push('phone');
        if (!profile.bank_name||!profile.account_number) gaps.push('bank details');
        if (!profile.birthday) gaps.push('birthday');
        if (gaps.length) list.push({id:'profile',icon:UserCircle2,label:'Complete your profile',detail:'Missing: '+gaps.join(', '),cta:'Update',path:'/profile',severity:'medium'});
      }

      const overdue = forms.filter((f:any)=>!subs.some((s:any)=>s.form_id===f.id&&s.period_key===periodKey(f.frequency)));
      if (overdue.length) {
        list.push({id:'forms',icon:AlertCircle,label:`${overdue.length} activity form${overdue.length>1?'s':''} due`,detail:overdue.slice(0,2).map((f:any)=>f.title).join(', ')+(overdue.length>2?'…':''),cta:'Submit',path:'/activity-report',severity:'high'});
        setDueForms(overdue.map((f:any)=>f.title));
      }
      if (msgCount&&msgCount>0) list.push({id:'inbox',icon:Mail,label:`${msgCount} unread message${msgCount>1?'s':''}`,detail:'New messages in your inbox',cta:'Read',path:'/inbox',severity:'medium'});

      const {data:cands} = await (supabase as any).from('candidates').select('id').eq('user_id',user.id);
      if (cands?.length) {
        const {data:apps} = await (supabase as any).from('applications').select('id').in('candidate_id',cands.map((c:any)=>c.id));
        if (apps?.length) {
          const {data:contracts} = await (supabase as any).from('contracts').select('id,signed_at').in('application_id',apps.map((a:any)=>a.id));
          const unsigned = (contracts||[]).filter((c:any)=>!c.signed_at).length;
          if (unsigned>0) list.push({id:'contract',icon:FileSignature,label:`${unsigned} contract${unsigned>1?'s':''} awaiting signature`,detail:'Sign to complete onboarding',cta:'Sign',path:'/my-contract',severity:'high'});
        }
      }
      setActions(list);

      // Birthdays
      const now = new Date();
      const mm=String(now.getMonth()+1).padStart(2,'0'), dd=String(now.getDate()).padStart(2,'0');
      try {
        const {data:bdays} = await (supabase as any).from('profiles').select('full_name,avatar_url,birthday').not('birthday','is',null);
        setTodayBirthdays((bdays||[]).filter((p:any)=>{const pts=p.birthday?.split('-');return pts&&pts[1]===mm&&pts[2]===dd;}).map((p:any)=>({name:p.full_name||'Team member',avatar:p.avatar_url})));
      } catch{}

      // Recent activity
      try {
        const {data:recent} = await db.from('activity_form_submissions').select('id,submitted_at,activity_forms(title)').eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(6);
        setRecentActivity((recent||[]).map((r:any)=>({id:r.id,text:(r.activity_forms as any)?.title||'Activity Form',sub:'Form submitted',time:r.submitted_at})));
      } catch{}
    })();
  }, [user, avatarUrl]);

  const now = new Date();
  const greeting = now.getHours()<12?'Good morning':now.getHours()<17?'Good afternoon':'Good evening';
  const initials = (fullName||'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const severityColor = {high:'text-red-500',medium:'text-orange-500',low:'text-primary'};
  const severityBg    = {high:'bg-red-50 dark:bg-red-950/20 border-red-200/60',medium:'bg-orange-50 dark:bg-orange-950/20 border-orange-200/60',low:'bg-muted/40'};

  return (
    <>
    <div className="flex gap-0 min-h-[calc(100vh-64px)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4">

      {/* ══════════════════════════════════════════════════════════════
          LEFT SIDEBAR — profile card + icon-grid nav
      ══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r bg-card">

        {/* Profile card */}
        <div className="flex flex-col items-center gap-2 px-4 py-6 border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className="relative cursor-pointer" onClick={() => navigate('/profile')}>
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-md">
              <AvatarImage src={avatarUrl||undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>
            {actions.some(a=>a.severity==='high') && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">{actions.filter(a=>a.severity==='high').length}</span>
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground leading-tight">{fullName||'Team member'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{positionName||'Employee'}</p>
            {departmentName && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{departmentName}</p>}
          </div>
          <p className="text-xs text-muted-foreground">{now.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p>
        </div>

        {/* Nav grid — 2 columns */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = currentPath === item.path;
              const hasBadge = item.path==='/inbox' && unread>0;
              return (
                <button key={item.path} onClick={()=>navigate(item.path)}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-all group
                    ${active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}>
                  {hasBadge && <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">{unread>9?'9+':unread}</span>}
                  <Icon className={`h-4 w-4 shrink-0 ${active?'text-primary-foreground':'group-hover:text-primary'}`} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </button>
              );
            })}
            {isLeader && (
              <button onClick={()=>navigate('/team-reports')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-all group hover:bg-accent text-muted-foreground hover:text-foreground">
                <Users className="h-4 w-4 shrink-0 group-hover:text-primary" />
                <span className="text-[10px] font-medium leading-tight">Team Reports</span>
              </button>
            )}
          </div>
        </nav>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* Welcome row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{greeting}, {(fullName||'').split(' ')[0]||'Team member'} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{now.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          {/* Stat pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>navigate('/inbox')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-colors text-sm">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{unread}</span>
              <span className="text-muted-foreground text-xs">messages</span>
            </button>
            <button onClick={()=>navigate('/jobs')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-colors text-sm">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{openJobs}</span>
              <span className="text-muted-foreground text-xs">open roles</span>
            </button>
          </div>
        </div>

        {/* Mobile nav — horizontal scroll pills (hidden on md+) */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {NAV_ITEMS.map(item=>{
            const Icon=item.icon;
            const active=currentPath===item.path;
            return (
              <button key={item.path} onClick={()=>navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-xs font-medium shrink-0 transition-all
                  ${active?'bg-primary text-primary-foreground border-primary':'bg-card hover:bg-accent text-muted-foreground'}`}>
                <Icon className="h-3.5 w-3.5" />{item.label}
              </button>
            );
          })}
        </div>

        {/* ── Action Required ─────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary" /> Action Required
              {actions.length>0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{actions.length}</Badge>}
            </h2>
          </div>
          <div className="p-4">
            {actions.length===0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                <p className="text-sm font-medium">You're all caught up! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map(a=>{
                  const Icon=a.icon;
                  return (
                    <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${severityBg[a.severity]}`}>
                      <Icon className={`h-4 w-4 shrink-0 ${severityColor[a.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{a.label}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{a.detail}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={()=>navigate(a.path)}>{a.cta}</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Two-column row: Today  +  Team Leads ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* TODAY */}
          <section className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
              <h2 className="font-semibold text-foreground text-sm">Today</h2>
              <button className="text-muted-foreground hover:text-primary transition-colors" onClick={()=>window.location.reload()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y">
              {todayBirthdays.length===0 && dueForms.length===0 ? (
                <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Nothing special today — enjoy your day!
                </div>
              ) : null}
              {todayBirthdays.map((b,i)=>(
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 shrink-0">
                    <span className="text-base leading-none">🎂</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Birthday today 🎉</p>
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={b.avatar||undefined} />
                    <AvatarFallback className="text-xs bg-rose-100 text-rose-600">{b.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              ))}
              {dueForms.map((f,i)=>(
                <button key={i} onClick={()=>navigate('/activity-report')}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left">
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f}</p>
                    <p className="text-xs text-muted-foreground">Form due today</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 shrink-0">Due</Badge>
                </button>
              ))}
            </div>
          </section>

          {/* TEAM LEADS */}
          <section className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
              <h2 className="font-semibold text-foreground text-sm">Team Leads</h2>
              {isLeader && (
                <button onClick={()=>navigate('/team-reports')} className="text-xs text-primary hover:underline font-medium">
                  Manage Team
                </button>
              )}
            </div>
            {teamLeads.length===0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-xs">No manager assigned yet.</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 px-5 py-2 border-b bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground">Lead Name</p>
                  <p className="text-xs font-semibold text-muted-foreground">Email</p>
                </div>
                <div className="divide-y">
                  {teamLeads.map(lead=>(
                    <div key={lead.id} className="grid grid-cols-2 items-center px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={lead.avatar||undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{lead.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{lead.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 w-fit">{lead.role.split(' ').slice(0,3).join(' ')}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.email||'—'}</p>
                    </div>
                  ))}
                  {isLeader && (
                    <button onClick={()=>navigate('/team-reports')}
                      className="w-full flex items-center gap-2.5 px-5 py-3 hover:bg-muted/30 transition-colors text-left">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">My Team</p>
                        <p className="text-xs text-muted-foreground">{subordinateIds.length} member{subordinateIds.length!==1?'s':''} reporting to you</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Two-column row: Recent Activities + Awards ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* RECENT ACTIVITIES */}
          <section className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
              <h2 className="font-semibold text-foreground text-sm">Recent Activities</h2>
              <button onClick={()=>navigate('/activity-report')} className="text-xs text-primary hover:underline font-medium">View all</button>
            </div>
            {recentActivity.length===0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Activity className="h-8 w-8 opacity-30" />
                <p className="text-xs">No recent activity yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivity.map(a=>{
                  const t = new Date(a.time);
                  const timeStr = t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={avatarUrl||undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{fullName||'You'}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.sub} — {a.text}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-primary/5 border border-primary/10 rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap">
                        <Clock className="h-3 w-3" />{timeStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* AWARDS & RECOGNITION */}
          <section className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Awards & Recognition
              </h2>
              <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="h-7 w-7 text-amber-500" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Star className="h-3 w-3 text-white fill-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">Employee Recognition</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
                  Celebrate achievements, milestones, and team wins. Awards and peer recognition will appear here.
                </p>
              </div>
            </div>
          </section>
        </div>

      </main>
    </div>

    {/* Manager modals */}
    <ManagerIntroModal
      open={introNagOpen} manager={manager} acknowledging={acknowledging}
      onViewMore={()=>{setIntroNagOpen(false);setManagerDialogOpen(true);}}
      onAcknowledge={async()=>{
        if(!user)return; setAcknowledging(true);
        await (supabase as any).from('profiles').update({manager_intro_acknowledged:true}).eq('id',user.id);
        setAcknowledging(false); setIntroNagOpen(false);
      }}
    />
    <ManagerAboutDialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen} manager={manager} />
    </>
  );
};

// ─── Manager intro modal ─────────────────────────────────────────────────────
const ManagerIntroModal: React.FC<{
  open:boolean; manager:ManagerInfo|null; acknowledging:boolean;
  onViewMore:()=>void; onAcknowledge:()=>void;
}> = ({open,manager,acknowledging,onViewMore,onAcknowledge}) => {
  if (!manager) return null;
  const introText = manager.about_me_excerpt||(manager.about_me?manager.about_me.slice(0,240)+(manager.about_me.length>240?'…':''):'');
  const fallbackEntry = getVisibleAboutEntries(manager)[0];
  return (
    <Dialog open={open} onOpenChange={o=>{if(!o)onAcknowledge();}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meet your direct manager</DialogTitle>
          <DialogDescription>A quick introduction from the person you'll be reporting to.</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={manager.avatar_url||undefined} />
            <AvatarFallback>{manager.full_name?.charAt(0)||'M'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{manager.full_name}</p>
            {(manager.designation||manager.position_name)&&<p className="text-xs text-muted-foreground">{manager.designation||manager.position_name}</p>}
            {introText ? <p className="text-sm mt-2 whitespace-pre-wrap">{introText}</p>
              : fallbackEntry ? <p className="text-sm mt-2"><span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{fallbackEntry[0].replace(/_/g,' ')}: </span>{String(fallbackEntry[1])}</p>
              : <p className="text-sm text-muted-foreground mt-2">No introduction provided.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onViewMore}>View full profile</Button>
          <Button onClick={onAcknowledge} disabled={acknowledging}>{acknowledging?'Saving…':'Got it, thanks'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Manager About Me dialog ─────────────────────────────────────────────────
const ManagerAboutDialog: React.FC<{
  open:boolean; onOpenChange:(o:boolean)=>void; manager:ManagerInfo|null;
}> = ({open,onOpenChange,manager}) => {
  if (!manager) return null;
  const aboutText = manager.about_me||manager.about_me_excerpt||'';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12"><AvatarImage src={manager.avatar_url||undefined} /><AvatarFallback>{manager.full_name?.charAt(0)||'M'}</AvatarFallback></Avatar>
            <div><DialogTitle>{manager.full_name}</DialogTitle>{(manager.designation||manager.position_name)&&<DialogDescription>{manager.designation||manager.position_name}</DialogDescription>}</div>
          </div>
        </DialogHeader>
        {aboutText ? <div><h4 className="text-sm font-semibold mb-1">About</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aboutText}</p></div>
          : <p className="text-sm text-muted-foreground">Your manager hasn't shared an About summary yet.</p>}
        {(manager.email||manager.phone)&&(
          <div className="mt-2 space-y-1.5 border-t pt-3">
            <h4 className="text-sm font-semibold">Contact</h4>
            {manager.email&&<a href={`mailto:${manager.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4 text-primary" />{manager.email}</a>}
            {manager.phone&&<a href={`tel:${manager.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="h-4 w-4 text-primary" />{manager.phone}</a>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDashboard;
