import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RequestEvent {
  id: string;
  request_id: string;
  actor_id: string | null;
  event_type: 'submitted' | 'approved' | 'rejected' | 'note_added' | 'repaid';
  note: string;
  created_at: string;
}

export const useRequestEvents = (requestId: string | null) =>
  useQuery({
    enabled: !!requestId,
    queryKey: ['advance_request_events', requestId],
    queryFn: async (): Promise<RequestEvent[]> => {
      const { data, error } = await (supabase as any)
        .from('advance_request_events')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAddRequestEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      request_id: string;
      actor_id: string;
      event_type: RequestEvent['event_type'];
      note?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('advance_request_events')
        .insert({ ...payload, note: payload.note ?? '' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['advance_request_events', v.request_id] });
    },
  });
};
