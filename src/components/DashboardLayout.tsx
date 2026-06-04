import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, LogOut, User, Mail, Menu, LayoutDashboard, FileText, FileStack, Settings, CalendarClock, Users, Briefcase, Globe, Megaphone, BookOpen, ClipboardList, Wallet, Receipt, Network, MessageSquare } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/hooks/usePresence';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const NAV_SECTIONS = [
  {
    label: 'General',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, capability: null },
      { path: '/profile', label: 'My Profile', icon: User, capability: null },
    ],
  },
  {
    label: 'Invoicing',
    items: [
      { path: '/generate-invoice', label: 'Generate Invoice', icon: FileText, capability: 'generate_invoice' },
      { path: '/bulk-invoice', label: 'Bulk Invoice', icon: FileStack, capability: 'bulk_invoice' },
      { path: '/invoices', label: 'View Invoices', icon: FileText, capability: 'view_invoices' },
      { path: '/my-invoices', label: 'My Payslips', icon: Receipt, capability: null },
      { path: '/invoice-statistics', label: 'Statistics', icon: BarChart3, capability: 'view_statistics' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/daily-tracker', label: 'Daily Tracker', icon: CalendarClock, capability: 'view_daily_tracker' },
      { path: '/finance', label: 'Finance', icon: Wallet, capability: null },
      { path: '/employees', label: 'Employees', icon: Users, capability: 'manage_employees' },
      { path: '/org-chart', label: 'Org Chart', icon: Network, capability: null },
      { path: '/company-settings', label: 'Company Settings', icon: Settings, capability: 'manage_company_settings' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/user-management', label: 'User Management', icon: Users, capability: 'manage_users' },
      { path: '/applications', label: 'HR Recruitment', icon: Briefcase, capability: 'manage_recruitment' },
      { path: '/jobs', label: 'Manage Job Positions', icon: Briefcase, capability: 'add_job_position' },
      { path: '/cms', label: 'Website CMS', icon: Globe, capability: 'manage_website_content' },
      { path: '/cms/sms-templates', label: 'SMS Templates', icon: MessageSquare, capability: 'manage_users' },
      { path: '/admin/chat-policies', label: 'Messaging Policies', icon: MessageSquare, capability: 'manage_users' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { path: '/activity-report', label: 'Activity Report', icon: ClipboardList, capability: null },
      { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, capability: null },
      { path: '/cms/knowledge-base', label: 'Manage Knowledge Base', icon: BookOpen, capability: 'manage_knowledge_base' },
      { path: '/cms/activity-forms', label: 'Manage Activity Forms', icon: ClipboardList, capability: 'manage_activity_forms' },
    ],
  },
  {
    label: 'Other',
    items: [
      { path: '/jobs', label: 'Job Openings', icon: Megaphone, capability: null },
      { path: '/inbox', label: 'Inbox', icon: Mail, capability: null },
    ],
  },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fullName, role, avatarUrl, signOut } = useAuth();
  const { hasCapability } = useCapabilities(user?.id ?? null);
  const [unreadCount, setUnreadCount] = useState(0);
  usePresence(user?.id ?? null);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await (supabase as any).
      from('messages').
      select('*', { count: 'exact', head: true }).
      eq('recipient_id', user.id).
      eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const channel = supabase.
    channel('unread-messages').
    on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      fetchUnread();
    }).
    subscribe();
    return () => {supabase.removeChannel(channel);};
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!item.capability) return true;
      if (role === 'admin') return true;
      return hasCapability(item.capability);
    }),
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-card-border shadow-financial-sm sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Left: nav + brand */}
            <div className="flex items-center space-x-3 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
                  {visibleSections.map((section, sectionIndex) => (
                    <React.Fragment key={section.label}>
                      {sectionIndex > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                        {section.label}
                      </DropdownMenuLabel>
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <DropdownMenuItem
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={isActive ? 'bg-accent font-semibold' : ''}>
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                onClick={() => navigate('/dashboard')}>
                <div className="bg-gradient-primary p-2 rounded-lg shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="hidden md:block min-w-0">
                  <h1 className="text-base font-bold text-primary-dark leading-tight truncate">FDL Workforce</h1>
                  <p className="text-xs text-muted-foreground truncate">Footprints Dynasty Limited</p>
                </div>
              </div>

              {/* Page title — center-left */}
              <div className="hidden lg:flex items-center gap-3 pl-4 ml-2 border-l border-border min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <ThemeToggle />

              {user && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/inbox')} className="relative">
                  <Mail className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              )}

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 px-2 gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span className="text-xs font-semibold text-foreground max-w-[140px] truncate">{fullName || user.email}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold truncate">{fullName || 'User'}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-[10px] w-fit mt-1 capitalize">{role}</Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/inbox')}>
                      <Mail className="mr-2 h-4 w-4" /> Inbox
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Mobile page title */}
          <div className="lg:hidden pb-2 -mt-1">
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>);

};

