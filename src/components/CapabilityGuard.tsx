import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { toast } from '@/hooks/use-toast';

interface CapabilityGuardProps {
  children: React.ReactNode;
  /** Capability key required. Pass null to allow any signed-in user. */
  requires?: string | null;
  /** If true, only admins may access (no capability override). */
  adminOnly?: boolean;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({ children, requires, adminOnly }) => {
  const { user, role, loading } = useAuth();
  const { capabilities, loading: capsLoading } = useCapabilities(user?.id ?? null);

  // Show loader while ANY of: auth resolving, user present but capabilities still loading,
  // or role hasn't arrived yet for a signed-in user (prevents false "Access denied").
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
