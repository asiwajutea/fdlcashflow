import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/supabase-db';
import { toast } from '@/hooks/use-toast';

export type AdvanceKind = 'salary_advance' | 'reimbursement' | 'cash_advance';
export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'repaid';

export interface AdvanceRequest {
  id: string;
  user_id: string;
  kind: AdvanceKind;
  category_id: string | null;
  amount: number;
  reason: string;
  receipt_url: string;
  repayment_plan: 'one' | 'two' | null;
  status: AdvanceStatus;
  approver_id: string | null;
  approver_note: string;
  repaid_count: number;
  decided_at: string | null;
  created_at: string;
}

export interface AdvanceFilters {
  scope?: 'mine' | 'team' | 'all';
  status?: AdvanceStatus | 'all';
  userId?: string | null;
}

export const useAdvanceRequests = (filters: AdvanceFilters = {}) => {
  const qc = useQueryClient();
  const key = ['advance_requests', filters];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = db.from('advance_requests').select('*').order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.userId) q = q.eq('user_id', filters.userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AdvanceRequest[]) ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<AdvanceRequest>) => {
      const { data, error } = await db.from('advance_requests').insert(payload).select().single();
      if (error) throw error;
      if (data && payload.user_id) {
        await db.from('advance_request_events').insert({
          request_id: (data as any).id,
          actor_id: payload.user_id,
          event_type: 'submitted',
          note: '',
        });
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Request submitted', description: 'Your request is pending approval.' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, note, approver_id, amount, user_id }: { id: string; status: 'approved' | 'rejected'; note: string; approver_id: string; amount?: number; user_id?: string }) => {
      const { error } = await db
        .from('advance_requests')
        .update({ status, approver_note: note, approver_id, decided_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await db.from('advance_request_events').insert({
        request_id: id,
        actor_id: approver_id,
        event_type: status,
        note,
      });
      // Fire-and-forget SMS to requester
      try {
        // resolve user_id and amount if missing
        let uid = user_id;
        let amt = amount;
        if (!uid || amt === undefined) {
          const { data: req } = await db.from('advance_requests').select('user_id, amount').eq('id', id).maybeSingle();
          uid = uid || req?.user_id;
          amt = amt ?? Number(req?.amount || 0);
        }
        if (uid) {
          const { data: prof } = await db.from('profiles').select('full_name, phone, email').eq('id', uid).maybeSingle();
          const { supabase } = await import('@/integrations/supabase/client');
          if (prof?.phone) {
            supabase.functions.invoke('send-sms', {
              body: { to: prof.phone, user_id: uid, template_key: 'finance_decision', vars: { name: (prof.full_name || 'there').split(' ')[0], amount: Number(amt || 0).toLocaleString(), status, note: note || '' } },
            }).catch(() => {});
          }
          // Also send email
          if (prof?.email) {
            supabase.functions.invoke('send-email', {
              body: { template_key: 'finance_decision', to: prof.email, name: (prof.full_name || 'there').split(' ')[0], user_id: uid, vars: { amount: Number(amt || 0).toLocaleString(), status, note: note || '' } },
            }).catch(() => {});
          }
        }
      } catch (e) { console.error('finance sms failed', e); }
    },
    onSuccess: (_d, v) => {
      toast({ title: v.status === 'approved' ? 'Approved' : 'Rejected' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['global_platform_advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_request_events', v.id] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // First check if the request is still pending — only pending can be cancelled
      const { data: req } = await db.from('advance_requests').select('status').eq('id', id).maybeSingle();
      if (!req) throw new Error('Request not found.');
      if (req.status !== 'pending') throw new Error(`This request has already been ${req.status} and cannot be cancelled.`);

      const { error, count } = await db.from('advance_requests').delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if ((count ?? 0) === 0) throw new Error('Unable to cancel — you may not have permission or the request is no longer pending.');
    },
    onSuccess: () => {
      toast({ title: 'Request cancelled', description: 'Your request has been cancelled successfully.' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['global_platform_advance_requests'] });
    },
    onError: (e: any) => toast({ title: 'Cannot cancel', description: e.message, variant: 'destructive' }),
  });

  return { ...query, requests: query.data ?? [], create, decide, remove };
};

export const useFinanceCategories = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['finance_categories'],
    queryFn: async () => {
      const { data, error } = await db.from('finance_categories').select('*').order('kind').order('display_order');
      if (error) throw error;
      return data ?? [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await db.from('finance_categories').upsert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_categories'] }); toast({ title: 'Saved' }); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('finance_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_categories'] }); },
  });
  return { categories: query.data ?? [], isLoading: query.isLoading, upsert, remove };
};

export const useFinanceBudgets = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['finance_budgets'],
    queryFn: async () => {
      const { data, error } = await db.from('finance_budgets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await db.from('finance_budgets').upsert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_budgets'] }); toast({ title: 'Saved' }); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('finance_budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_budgets'] }); },
  });
  return { budgets: query.data ?? [], isLoading: query.isLoading, upsert, remove };
};
