import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MyInvoices = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ['my-payslips', user?.id, user?.email],
    queryFn: async () => {
      const uid = user!.id;
      const email = (user!.email || '').toLowerCase();
      const orParts = [`user_id.eq.${uid}`, `profile_id.eq.${uid}`];
      if (email) orParts.push(`email.ilike.${email}`);
      const { data: emps } = await (supabase as any)
        .from('employees')
        .select('id, employee_id, full_name, email')
        .or(orParts.join(','));
      const empIds = (emps || []).map((e: any) => e.id);
      if (empIds.length === 0) return { linked: false, rows: [] as any[] };
      const { data: rows } = await (supabase as any)
        .from('invoices')
        .select('*')
        .in('employee_id', empIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      // de-dup by id
      const seen = new Set<string>();
      const unique = (rows || []).filter((r: any) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      return { linked: true, rows: unique };
    },
  });

  const loading = authLoading || isLoading;
  const linked = data?.linked ?? true;
  const rows = data?.rows ?? [];

  return (
    <DashboardLayout title="My Payslips">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> My Payslips</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : !linked ? (
            <p className="text-sm text-muted-foreground">Your account isn't linked to an employee record yet. Please ask an admin to link your profile in Employee Management.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payslips have been issued to you yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Slip #</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Issued</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{MONTHS[(r.month||1)-1]} {r.year}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.slip_number || r.invoice_number}</TableCell>
                    <TableCell>₦{Number(r.gross_payment||0).toLocaleString()}</TableCell>
                    <TableCell>₦{Number(r.total_deductions||0).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">₦{Number(r.net_payment||0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.date_issued}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default MyInvoices;
