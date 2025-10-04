import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  user: User | null;
  role: 'admin' | 'guest' | null;
  loading: boolean;
}

export const useAuth = () => {
  const [profile, setProfile] = useState<UserProfile>({
    user: null,
    role: null,
    loading: true
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        setProfile({
          user: session.user,
          role: roleData?.role || null,
          loading: false
        });
      } else {
        setProfile({ user: null, role: null, loading: false });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          setProfile({
            user: session.user,
            role: roleData?.role || null,
            loading: false
          });
        } else {
          setProfile({ user: null, role: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile({ user: null, role: null, loading: false });
  };

  return { ...profile, signOut };
};
