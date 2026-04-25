import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  User, CalendarClock, Briefcase, Mail, Receipt, BarChart3,
  Wallet, MessageSquare, BookOpen, LifeBuoy, ArrowRight
} from 'lucide-react';

const EMPLOYEE_LINKS = [
  { path: '/profile', label: 'My Profile', icon: User, description: 'View & edit your profile' },
  { path: '/daily-tracker', label: 'Daily Tracker', icon: CalendarClock, description: 'Track your daily income & expenses' },
  { path: '/jobs', label: 'Job Openings', icon: Briefcase, description: 'Browse internal opportunities' },
  { path: '/inbox', label: 'Inbox', icon: Mail, description: 'Messages from your team' },
  { path: '/my-invoices', label: 'My Invoices', icon: Receipt, description: 'View your payslips' },
  { path: '/activity-report', label: 'Activity Report', icon: BarChart3, description: 'Your work activity over time' },
  { path: '/my-finance', label: 'Finance', icon: Wallet, description: 'Personal financial overview' },
  { path: '/suggestions', label: 'Suggestions / Complaints', icon: MessageSquare, description: 'Share feedback with HR' },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, description: 'Company policies & guides' },
  { path: '/employee-support', label: 'Employee Support', icon: LifeBuoy, description: 'Get help when you need it' },
];

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, fullName } = useAuth();
  const [unread, setUnread] = useState(0);
  const [openJobs, setOpenJobs] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: msgCount }, { count: jobCount }] = await Promise.all([
        (supabase as any).from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('is_read', false),
        (supabase as any).from('job_positions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setUnread(msgCount || 0);
      setOpenJobs(jobCount || 0);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 border-0">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {fullName || 'Team member'}! 👋</h2>
          <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Your Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EMPLOYEE_LINKS.map(link => {
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
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;
