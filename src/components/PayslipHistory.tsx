import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PayslipHistoryProps {
  employeeId: string | null;
  employeeName?: string;
}

interface HistoricalPayslip {
  id: string;
  month: number;
  year: number;
  date_issued: string;
  gross_payment: number;
  total_deductions: number;
  net_payment: number;
  invoice_number: string;
}

export function PayslipHistory({ employeeId, employeeName }: PayslipHistoryProps) {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<HistoricalPayslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchPayslipHistory();
    } else {
      setPayslips([]);
    }
  }, [employeeId]);

  const fetchPayslipHistory = async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, month, year, date_issued, gross_payment, total_deductions, net_payment, invoice_number')
        .eq('employee_id', employeeId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setPayslips(data || []);
    } catch (error) {
      console.error('Error fetching payslip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  if (!employeeId) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>
                  Payslip History {employeeName && `- ${employeeName}`}
                </CardTitle>
                {payslips.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({payslips.length} {payslips.length === 1 ? 'payslip' : 'payslips'})
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : payslips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No previous payslips found for this employee.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip) => (
                      <TableRow key={payslip.id}>
                        <TableCell className="font-medium">{payslip.invoice_number}</TableCell>
                        <TableCell>
                          {getMonthName(payslip.month)} {payslip.year}
                        </TableCell>
                        <TableCell>
                          {new Date(payslip.date_issued).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payslip.gross_payment)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payslip.total_deductions)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(payslip.net_payment)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/generate-invoice?edit=${payslip.id}`)}
                          >
                            View/Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
