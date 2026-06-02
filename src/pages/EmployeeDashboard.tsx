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
  AlertCircle, CheckCircle2, FileSignature, UserCircle2, Users
} from 'lucide-react';
import { useIsLeader } from '@/hooks/useIsLeader';

interface ManagerInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  about_me: string | null;
  about_me_excerpt: string | null;
  about_details: Record<string, any> | null;
  about_visibility: Record<string, boolean> | null;
  position_name?: string | null;
}

const periodKey = (frequency: string): string => {
  const now = new Date();
  if (frequency === 'daily') return now.toISOString().slice(0, 10);
  if (frequency === 'weekly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') return now.toISOString().slice(0, 7);
  return 'once';
};

const WORKSPACE_GROUPS: { title: string; links: { path: string; label: string; icon: any; description: string }[] }[] = [
  {
    title: 'My Work',
    links: [
      { path: '/daily-tracker', label: 'Daily Tracker', icon: CalendarClock, description: 'Track your daily income & expenses' },
      { path: '/activity-report', label: 'Activity Report', icon: BarChart3, description: 'Submit activity forms' },
      { path: '/my-invoices', label: 'My Payslips', icon: Receipt, description: 'View your payslips' },
      { path: '/my-finance', label: 'Finance', icon: Wallet, description: 'Personal financial overview' },
    ],
  },
  {
    title: 'Communication',
    links: [
      { path: '/inbox', label: 'Inbox', icon: Mail, description: 'Messages from your team' },
      { path: '/suggestions', label: 'Suggestions', icon: MessageSquare, description: 'Share feedback with HR' },
    ],
  },
  {
    title: 'Career',
    links: [
      { path: '/profile', label: 'My Profile', icon: User, description: 'View & edit your profile' },
      { path: '/jobs', label: 'Job Openings', icon: Briefcase, description: 'Browse internal opportunities' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, description: 'Company policies & guides' },
      { path: '/employee-support', label: 'Employee Support', icon: LifeBuoy, description: 'Get help when you need it' },
    ],
  },
];

interface ActionItem {
  id: string;
  icon: any;
  label: string;
  detail: string;
  cta: string;
  path: string;
  severity: 'high' | 'medium' | 'low';
}

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, fullName, avatarUrl } = useAuth();
  const { isLeader, subordinateIds } = useIsLeader();
  const [unread, setUnread] = useState(0);
  const [openJobs, setOpenJobs] = useState(0);
  const [actions, setActions] = useState<ActionItem[]>([]);
  
  // New state variables for header details
  const [positionName, setPositionName] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');

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

      // Fetch Designation, Department, and Manager details
      if (profile) {
        const detailsDeps = [
          profile.position_id ? db.from('positions').select('name').eq('id', profile.position_id).maybeSingle() : Promise.resolve({ data: null }),
          profile.department_id ? db.from('departments').select('name').eq('id', profile.department_id).maybeSingle() : Promise.resolve({ data: null }),
          profile.manager_id ? (supabase as any).from('profiles').select('full_name').eq('id', profile.manager_id).maybeSingle() : Promise.resolve({ data: null }),
        ];
        
        const [posRes, deptRes, mgrRes] = await Promise.all(detailsDeps);
        if (posRes.data) setPositionName(posRes.data.name);
        if (deptRes.data) setDepartmentName(deptRes.data.name);
        if (mgrRes.data) setManagerName(mgrRes.data.full_name);

        // Profile gaps
        const gaps: string[] = [];
        if (!profile.avatar_url && !avatarUrl) gaps.push('photo');
        if (!profile.phone) gaps.push('phone');
        if (!profile.bank_name || !profile.account_number) gaps.push('bank details');
        if (!profile.birthday) gaps.push('birthday');
        if (gaps.length) {
          list.push({
            id: 'profile',
            icon: UserCircle2,
            label: 'Complete your profile',
            detail: 'Missing: ' + gaps.join(', '),
            cta: 'Update',
            path: '/profile',
            severity: 'medium',
          });
        }
      }

      // Overdue forms
      const overdue = forms.filter((f: any) => {
        const pk = periodKey(f.frequency);
        return !subs.some((s: any) => s.form_id === f.id && s.period_key === pk);
      });
      if (overdue.length) {
        list.push({
          id: 'forms',
          icon: AlertCircle,
          label: `${overdue.length} activity form${overdue.length > 1 ? 's' : ''} due`,
          detail: overdue.slice(0, 2).map((f: any) => f.title).join(', ') + (overdue.length > 2 ? '…' : ''),
          cta: 'Submit now',
          path: '/activity-report',
          severity: 'high',
        });
      }

      // Unread messages
      if (msgCount && msgCount > 0) {
        list.push({
          id: 'inbox',
          icon: Mail,
          label: `${msgCount} unread message${msgCount > 1 ? 's' : ''}`,
          detail: 'New messages in your inbox',
          cta: 'Read',
          path: '/inbox',
          severity: 'medium',
        });
      }

      // Pending contracts
      const { data: cands } = await (supabase as any).from('candidates').select('id').eq('user_id', user.id);
      if (cands && cands.length) {
        const candidateIds = cands.map((c: any) => c.id);
        const { data: apps } = await (supabase as any).from('applications').select('id').in('candidate_id', candidateIds);
        if (apps && apps.length) {
          const { data: contracts } = await (supabase as any)
            .from('contracts').select('id,signed_at').in('application_id', apps.map((a: any) => a.id));
          const unsigned = (contracts || []).filter((c: any) => !c.signed_at).length;
          if (unsigned > 0) {
            list.push({
              id: 'contract',
              icon: FileSignature,
              label: `${unsigned} contract${unsigned > 1 ? 's' : ''} awaiting signature`,
              detail: 'Sign to complete onboarding',
              cta: 'Sign',
              path: '/inbox',
              severity: 'high',
            });
          }
        }
      }

      setActions(list);
    })();
  }, [user, avatarUrl]);

  const severityClasses = {
    high: 'border-l-4 border-l-destructive',
    medium: 'border-l-4 border-l-orange-500',
    low: 'border-l-4 border-l-primary',
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 border-0">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back, {fullName || 'Team member'}! 👋</h2>
            <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
          </div>
          
          {/* New Details Section */}
          {(positionName || departmentName || managerName) && (
            <div className="flex flex-wrap gap-2">
              {positionName && (
                <Badge variant="outline" className="bg-background/60 flex items-center gap-1.5 py-1">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  {positionName}
                </Badge>
              )}
              {departmentName && (
                <Badge variant="outline" className="bg-background/60 flex items-center gap-1.5 py-1">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {departmentName}
                </Badge>
              )}
              {managerName && (
                <Badge variant="outline" className="bg-background/60 flex items-center gap-1.5 py-1">
                  <UserCircle2 className="h-3.5 w-3.5 text-primary" />
                  Manager: {managerName}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action checklist */}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unread messages</p>
              <p className="text-2xl font-bold">{unread}</p>
            </div>
            <Mail className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open job positions</p>
              <p className="text-2xl font-bold">{openJobs}</p>
            </div>
            <Briefcase className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
            <CalendarClock className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      {/* Leader entry */}
      {isLeader && (
        <button
          onClick={() => navigate('/team-reports')}
          className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors group flex items-center gap-3"
        >
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Team Reports</p>
            <p className="text-xs text-muted-foreground">Income, expenses and submissions for your {subordinateIds.length} downline member{subordinateIds.length === 1 ? '' : 's'}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </button>
      )}

      {/* Grouped workspace */}
      <div className="space-y-6">
        {WORKSPACE_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">{group.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {group.links.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="text-left p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors group flex items-center gap-3"
                  >
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
