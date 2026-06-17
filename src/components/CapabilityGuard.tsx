import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CapabilityGuardProps {
  children: React.ReactNode;
  /** Capability key required. Pass null to allow any signed-in user. */
  requires?: string | null;
  /** If true, only admins may access (no capability override). */
  adminOnly?: boolean;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({ children, requires, adminOnly }) => {
  const { user, role, loading, capabilities: authCapabilities } = useAuth();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capsLoading, setCapsLoading] = useState(true);

  // Always do a fresh DB fetch on mount so a user who gained capabilities
  // since their last login sees them immediately without signing out.
  useEffect(() => {
    if (!user?.id) {
      setCapabilities([]);
      setCapsLoading(false);
      return;
    }
    setCapsLoading(true);
    (supabase as any)
      .from('user_capabilities')
      .select('capability')
      .eq('user_id', user.id)
      .then(({ data, error }: any) => {
        if (error) {
          console.error('[CapabilityGuard] Failed to fetch capabilities:', error.message);
          // Fall back to whatever useAuth already loaded
          setCapabilities(authCapabilities ?? []);
        } else {
          setCapabilities(data?.map((c: any) => c.capability) ?? []);
        }
        setCapsLoading(false);
      });
  }, [user?.id]);

  // Show loader while auth is resolving, capabilities are loading,
  // or role hasn't arrived yet (prevents false "Access denied").
  if (loading || (user && capsLoading) || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (adminOnly && role !== 'admin') {
    toast({ title: 'Access denied', description: 'Admin only.', variant: 'destructive' });
    return <Navigate to="/dashboard" replace />;
  }

  if (requires && role !== 'admin' && !capabilities.includes(requires)) {
    toast({ title: 'Access denied', description: 'You no longer have permission to view this page.', variant: 'destructive' });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
