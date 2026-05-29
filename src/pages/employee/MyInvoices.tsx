import { useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Loader2, Download, Eye, TrendingUp, Wallet, PiggyBank, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { InvoiceTemplate } from '@/components/InvoiceTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const MyInvoices = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [viewing, setViewing] = useState<any>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any>(null);
  const [viewingLines, setViewingLines] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
        .select('id, employee_id, full_name, designation, email')
        .or(orParts.join(','));
      const empIds = (emps || []).map((e: any) => e.id);
      if (empIds.length === 0) return { linked: false, rows: [] as any[], emps: [] as any[] };
      const { data: rows } = await (supabase as any)
        .from('invoices')
        .select('*')
        .in('employee_id', empIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      const seen = new Set<string>();
      const unique = (rows || []).filter((r: any) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      return { linked: true, rows: unique, emps: emps || [] };
    },
  });

  const loading = authLoading || isLoading;
  const linked = data?.linked ?? true;
  const rows = data?.rows ?? [];

  const scorecard = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const ytd = rows.filter((r: any) => r.year === thisYear);
    const sum = (k: string) => ytd.reduce((s: number, r: any) => s + Number(r[k] || 0), 0);
    const totalNet = sum('net_payment');
    return {
      count: ytd.length,
      ytdGross: sum('gross_payment'),
      ytdNet: totalNet,
      ytdTax: sum('paye_tax'),
      ytdSavings: sum('total_savings'),
      avgNet: ytd.length ? totalNet / ytd.length : 0,
    };
  }, [rows]);

  const openView = async (row: any) => {
    const emp = (data?.emps || []).find((e: any) => e.id === row.employee_id) || {
      employee_id: '—', full_name: user?.email || 'Employee', designation: '',
    };
    const { data: lines } = await (supabase as any)
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', row.id);
    setViewingEmployee(emp);
    setViewingLines(lines || []);
    setViewing(row);
  };

  const downloadPdf = async () => {
    if (!previewRef.current || !viewing) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
      const img = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW = pageW;
      const imgH = Math.min(pageH, pageW * ratio);
      pdf.addImage(img, 'JPEG', 0, 0, imgW, imgH);
      pdf.save(`Payslip-${viewing.slip_number || viewing.invoice_number}.pdf`);
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const earnings = viewingLines.filter(l => l.item_type === 'earning').map(l => ({ description: l.description, amount: String(l.amount || 0) }));
  const deductions = viewingLines.filter(l => l.item_type === 'deduction').map(l => ({ description: l.description, amount: String(l.amount || 0) }));

  const ScoreTile = ({ icon: Icon, label, value, tone }: any) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="My Payslips">
      <div className="space-y-6">
        {/* Scorecard */}
        {linked && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ScoreTile icon={Receipt} label={`Payslips ${new Date().getFullYear()}`} value={scorecard.count} tone="bg-primary/10 text-primary" />
            <ScoreTile icon={TrendingUp} label="YTD Gross" value={fmt(scorecard.ytdGross)} tone="bg-primary/10 text-primary" />
            <ScoreTile icon={Wallet} label="YTD Net" value={fmt(scorecard.ytdNet)} tone="bg-emerald-500/10 text-emerald-600" />
            <ScoreTile icon={Calculator} label="YTD Tax" value={fmt(scorecard.ytdTax)} tone="bg-orange-500/10 text-orange-500" />
            <ScoreTile icon={PiggyBank} label="YTD Savings" value={fmt(scorecard.ytdSavings)} tone="bg-blue-500/10 text-blue-600" />
            <ScoreTile icon={Wallet} label="Avg Net" value={fmt(scorecard.avgNet)} tone="bg-purple-500/10 text-purple-600" />
          </div>
        )}

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Slip #</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Issued</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{MONTHS[(r.month||1)-1]} {r.year}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{r.slip_number || r.invoice_number}</TableCell>
                        <TableCell>{fmt(r.gross_payment)}</TableCell>
                        <TableCell>{fmt(r.total_deductions)}</TableCell>
                        <TableCell className="font-semibold">{fmt(r.net_payment)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.date_issued}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openView(r)} className="gap-1">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-8">
              <span>Payslip {viewing?.slip_number || viewing?.invoice_number}</span>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="gap-1">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewing && viewingEmployee && (
            <div ref={previewRef} className="bg-white">
              <InvoiceTemplate
                employee={{
                  employee_id: viewingEmployee.employee_id,
                  full_name: viewingEmployee.full_name,
                  designation: viewingEmployee.designation || '',
                }}
                invoiceNumber={viewing.invoice_number}
                slipNumber={viewing.slip_number}
                month={viewing.month}
                year={viewing.year}
                dateIssued={viewing.date_issued}
                earnings={earnings}
                deductions={deductions}
                totals={{
                  grossPayment: Number(viewing.gross_payment || 0),
                  totalDeductions: Number(viewing.total_deductions || 0),
                  netPayment: Number(viewing.net_payment || 0),
                  totalSavings: Number(viewing.total_savings || 0),
                }}
                additionalFields={{
                  totalMonthlyIncome: String(viewing.total_monthly_income || 0),
                  outstandingIou: String(viewing.outstanding_iou || 0),
                  downPayment: String(viewing.down_payment || 0),
                  egf: String(viewing.egf || 0),
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyInvoices;
