import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Receipt } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MyInvoices = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: emp } = await (supabase as any).from('employees').select('id,employee_id,full_name').eq('user_id', user.id).maybeSingle();
      if (!emp) { setLinked(false); setLoading(false); return; }
      const { data } = await (supabase as any).from('invoices').select('*').eq('employee_id', emp.id).order('year', { ascending: false }).order('month', { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout title="My Payslips">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> My Payslips</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : !linked ? (
            <p className="text-sm text-muted-foreground">Your account isn't linked to an employee record yet. Please ask an admin to link your profile in Employee Management.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payslips have been issued to you yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Slip #</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Issued</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
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
