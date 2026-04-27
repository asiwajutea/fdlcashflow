import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, LogOut, User, Mail, Menu, LayoutDashboard, FileText, FileStack, Settings, CalendarClock, Users, Briefcase, Globe, Megaphone, BookOpen } from 'lucide-react';

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
      { path: '/invoice-statistics', label: 'Statistics', icon: BarChart3, capability: 'view_statistics' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/daily-tracker', label: 'Daily Tracker', icon: CalendarClock, capability: 'view_daily_tracker' },
      { path: '/employees', label: 'Employees', icon: Users, capability: 'manage_employees' },
      { path: '/company-settings', label: 'Company Settings', icon: Settings, capability: 'manage_company_settings' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/user-management', label: 'User Management', icon: Users, capability: 'manage_users' },
      { path: '/applications', label: 'HR Recruitment', icon: Briefcase, capability: 'manage_recruitment' },
      { path: '/cms', label: 'Website CMS', icon: Globe, capability: 'manage_website_content' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen, capability: null },
      { path: '/cms/knowledge-base', label: 'Manage Knowledge Base', icon: BookOpen, capability: 'manage_knowledge_base' },
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
      <header className="bg-card border-b border-card-border shadow-financial-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Navigation Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
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
                            className={isActive ? 'bg-accent font-semibold' : ''}
                          >
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
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/dashboard')}>
                <div className="bg-gradient-primary p-2 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-primary-dark">FDL Workforce</h1>
                  <p className="text-sm text-muted-foreground">Footprints Dynasty Limited</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              {/* Inbox button */}
              {user &&
              <Button variant="ghost" size="sm" onClick={() => navigate('/inbox')} className="relative">
                  <Mail className="h-4 w-4" />
                  {unreadCount > 0 &&
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                }
                </Button>
              }

              {user &&
              <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{fullName || user.email}</span>
                    </div>
                    <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {role}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              }
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>);

};

