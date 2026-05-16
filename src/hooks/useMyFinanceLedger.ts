import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface MyFinanceLedger {
  linked: boolean;
  payslips: any[];
  salaryPaid: number;
  monthly: { month: string; income: number; expense: number }[];
  byCategory: { name: string; value: number }[];
}

export function useMyFinanceLedger(userId: string | null, email: string | null) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['my-finance-ledger', userId, email],
    queryFn: async (): Promise<MyFinanceLedger> => {
      const uid = userId!;
      const e = (email || '').toLowerCase();
      const orParts = [`user_id.eq.${uid}`, `profile_id.eq.${uid}`];
      if (e) orParts.push(`email.ilike.${e}`);
      const { data: emps } = await (supabase as any)
        .from('employees')
        .select('id, email')
        .or(orParts.join(','));
      const empIds = (emps || []).map((x: any) => x.id);

      let payslips: any[] = [];
      if (empIds.length) {
        const { data } = await (supabase as any)
          .from('invoices')
          .select('*')
          .in('employee_id', empIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        payslips = data || [];
      }

      // monthly cashflow from payslips (income = net_payment, expense = total_deductions)
      const map: Record<string, { month: string; income: number; expense: number; sort: string }> = {};
      let salaryPaid = 0;
      payslips.forEach((p: any) => {
        const d = new Date(p.year, (p.month || 1) - 1, 1);
        const key = format(d, 'MMM yy');
        const sort = `${p.year}-${String(p.month).padStart(2, '0')}`;
        if (!map[key]) map[key] = { month: key, income: 0, expense: 0, sort };
        map[key].income += Number(p.net_payment || 0);
        map[key].expense += Number(p.total_deductions || 0);
        salaryPaid += Number(p.net_payment || 0);
      });
      const monthly = Object.values(map).sort((a, b) => a.sort.localeCompare(b.sort)).slice(-12).map(({ sort, ...r }) => r);

      return {
        linked: empIds.length > 0,
        payslips,
        salaryPaid,
        monthly,
        byCategory: [],
      };
    },
  });
}
