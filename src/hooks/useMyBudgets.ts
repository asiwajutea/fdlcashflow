import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';

export interface BudgetUsage {
  budget: any;
  used: number;
  remaining: number;
  pct: number;
}

export function useMyBudgets(userId: string | null) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['my-budgets', userId],
    queryFn: async (): Promise<BudgetUsage[]> => {
      const uid = userId!;
      // Fetch profile (department_id) and role in parallel
      const [profileRes, roleRes, budgetsRes] = await Promise.all([
        (supabase as any).from('profiles').select('department_id').eq('id', uid).maybeSingle(),
        (supabase as any).from('user_roles').select('role').eq('user_id', uid).maybeSingle(),
        db.from('finance_budgets').select('*'),
      ]);
      const deptId: string | null = profileRes.data?.department_id ?? null;
      const role: string | null = roleRes.data?.role ?? null;
      const allBudgets: any[] = budgetsRes.data ?? [];

      const applicable = allBudgets.filter((b) => {
        if (b.scope_type === 'user' && b.scope_id === uid) return true;
        if (b.scope_type === 'role' && role && b.scope_id === role) return true;
        if (b.scope_type === 'department' && deptId && b.scope_id === deptId) return true;
        return false;
      });
      if (applicable.length === 0) return [];

      // Fetch this month's requests for user
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data: reqs } = await db
        .from('advance_requests')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['approved', 'repaid'])
        .gte('created_at', start.toISOString());

      return applicable.map((b) => {
        const used = (reqs || [])
          .filter((r: any) =>
            r.kind === b.kind && (!b.category_id || r.category_id === b.category_id)
          )
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const limit = Number(b.monthly_limit || 0);
        const remaining = Math.max(0, limit - used);
        const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return { budget: b, used, remaining, pct };
      });
    },
  });
}
