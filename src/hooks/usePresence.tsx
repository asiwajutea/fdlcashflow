import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Pings user_presence every ~60s while user is signed in and the tab is visible. */
export function usePresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      await (supabase as any).from('user_presence').upsert({
        user_id: userId,
        last_seen_at: new Date().toISOString(),
      });
    };

    ping();
    const interval = setInterval(ping, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId]);
}
