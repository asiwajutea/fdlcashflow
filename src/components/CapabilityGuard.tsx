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
  // We also refresh the session first to ensure the JWT is valid — a stale
  // or role-switched token causes Supabase to silently return empty rows.
  useEffect(() => {
    if (!user?.id) {
      setCapabilities([]);
      setCapsLoading(false);
      return;
    }
    setCapsLoading(true);
    supabase.auth.refreshSession()
      .then(({ data: sessionData, error: sessionError }) => {
        console.log('[CapabilityGuard] session refresh:', sessionError ? `ERROR: ${sessionError.message}` : `OK, uid=${sessionData?.session?.user?.id}`);
        return (supabase as any)
          .from('user_capabilities')
          .select('capability')
          .eq('user_id', user.id);
      })
      .then(({ data, error, status, statusText }: any) => {
        console.log(`[CapabilityGuard] capabilities fetch: status=${status} error=${error?.message ?? 'none'} rowCount=${data?.length ?? 'null'} rows=${JSON.stringify(data)}`);
        if (error) {
          console.error('[CapabilityGuard] Failed to fetch capabilities:', error.message);
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
    console.warn(
      `[CapabilityGuard] Access denied. requires="${requires}" role="${role}" capabilities=[${capabilities.join(', ')}] userId=${user.id}`
    );
    toast({ title: 'Access denied', description: 'You no longer have permission to view this page.', variant: 'destructive' });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
