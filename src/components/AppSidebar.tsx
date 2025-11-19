import { 
  Home, 
  FileText, 
  Files, 
  List, 
  BarChart3, 
  Users, 
  Receipt, 
  Settings 
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navigationItems = [
  {
    group: 'Dashboard',
    items: [
      { title: 'Home', url: '/', icon: Home },
    ],
  },
  {
    group: 'Invoicing',
    items: [
      { title: 'Generate Invoice', url: '/generate-invoice', icon: FileText },
      { title: 'Bulk Invoice', url: '/bulk-invoice', icon: Files },
      { title: 'Invoice List', url: '/invoices', icon: List },
      { title: 'Invoice Statistics', url: '/invoice-statistics', icon: BarChart3 },
    ],
  },
  {
    group: 'Management',
    items: [
      { title: 'Employee Management', url: '/employees', icon: Users },
      { title: 'Daily Tracker', url: '/daily-tracker', icon: Receipt },
    ],
  },
  {
    group: 'Settings',
    items: [
      { title: 'Company Settings', url: '/company-settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar 
      collapsible="icon"
      className="border-r border-border bg-card"
    >
      <SidebarContent className="pt-4">
        <TooltipProvider delayDuration={0}>
          {navigationItems.map((group) => (
            <SidebarGroup key={group.group}>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-muted-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wider">
                  {group.group}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);
                    
                    const menuButton = (
                      <SidebarMenuButton 
                        asChild
                        isActive={active}
                        className="transition-all duration-200 hover:scale-[1.02]"
                      >
                        <Link 
                          to={item.url}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                            active 
                              ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium' 
                              : 'hover:bg-muted/50 text-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && (
                            <span className="animate-fade-in">{item.title}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    );

                    return (
                      <SidebarMenuItem key={item.title}>
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {menuButton}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          menuButton
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
}
