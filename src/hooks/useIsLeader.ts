import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useIsLeader = () => {
  const { user } = useAuth();
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_my_subordinates');
      if (!alive) return;
      if (error) {
        setSubordinateIds([]);
      } else {
        setSubordinateIds((data || []).map((r: any) => r.user_id));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  return { isLeader: subordinateIds.length > 0, subordinateIds, loading };
};
