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
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Request submitted', description: 'Your request is pending approval.' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, note, approver_id }: { id: string; status: 'approved' | 'rejected'; note: string; approver_id: string }) => {
      const { error } = await db
        .from('advance_requests')
        .update({ status, approver_note: note, approver_id, decided_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast({ title: v.status === 'approved' ? 'Approved' : 'Rejected' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('advance_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Deleted' });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
    },
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
