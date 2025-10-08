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
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching role:', roleError);
        }

        setProfile({
          user: session.user,
          role: roleData?.role || null,
          loading: false
        });
      } else {
        setProfile({ user: null, role: null, loading: false });
      }
    }).catch((error) => {
      console.error('Error getting session:', error);
      setProfile({ user: null, role: null, loading: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Use setTimeout to defer the role fetch
          setTimeout(async () => {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (roleError) {
              console.error('Error fetching role:', roleError);
            }

            setProfile({
              user: session.user,
              role: roleData?.role || null,
              loading: false
            });
          }, 0);
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
