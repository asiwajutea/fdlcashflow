import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  user: User | null;
  role: 'admin' | 'employee' | 'guest' | 'candidate' | null;
  fullName: string | null;
  avatarUrl: string | null;
  loading: boolean;
  capabilities: string[];
}

export const useAuth = () => {
  const [profile, setProfile] = useState<UserProfile>({
    user: null,
    role: null,
    fullName: null,
    avatarUrl: null,
    loading: true,
    capabilities: []
  });

  const fetchUserData = useCallback(async (userId: string) => {
    const [roleResult, profileResult, capabilitiesResult] = await Promise.all([
      (supabase as any).from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      (supabase as any).from('profiles').select('full_name, avatar_url').eq('id', userId).maybeSingle(),
      (supabase as any).from('user_capabilities').select('capability').eq('user_id', userId)
    ]);

    return {
      role: (roleResult.data?.role as 'admin' | 'employee' | 'guest' | 'candidate') || null,
      fullName: profileResult.data?.full_name || null,
      avatarUrl: profileResult.data?.avatar_url || null,
      capabilities: capabilitiesResult.data?.map((c: any) => c.capability) || []
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        setProfile({
          user: session.user,
          role: userData.role,
          fullName: userData.fullName,
          avatarUrl: userData.avatarUrl,
          loading: false,
          capabilities: userData.capabilities
        });
      } else {
        setProfile({ user: null, role: null, fullName: null, avatarUrl: null, loading: false, capabilities: [] });
      }
    }).catch(() => {
      setProfile({ user: null, role: null, fullName: null, avatarUrl: null, loading: false, capabilities: [] });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const userData = await fetchUserData(session.user.id);
            setProfile({
              user: session.user,
              role: userData.role,
              fullName: userData.fullName,
              avatarUrl: userData.avatarUrl,
              loading: false,
              capabilities: userData.capabilities
            });
          }, 0);
        } else {
          setProfile({ user: null, role: null, fullName: null, avatarUrl: null, loading: false, capabilities: [] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile({ user: null, role: null, fullName: null, avatarUrl: null, loading: false, capabilities: [] });
  };

  const hasCapability = useCallback((capability: string) => {
    return profile.capabilities.includes(capability);
  }, [profile.capabilities]);

  return { ...profile, signOut, hasCapability };
};
