import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, ArrowLeft, FileText, BarChart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate } from '@/components/InvoiceTemplate';

interface Invoice {
  id: string;
  invoice_number: string;
  slip_number: string;
  month: number;
  year: number;
  date_issued: string;
  gross_payment: number;
  total_deductions: number;
  net_payment: number;
  total_monthly_income: number;
  outstanding_iou: number;
  down_payment: number;
  egf: number;
  total_savings: number;
  employees: {
    employee_id: string;
    full_name: string;
    designation: string;
  };
}

const InvoiceList = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceLineItems, setSelectedInvoiceLineItems] = useState<{
    earnings: Array<{ description: string; amount: string }>;
    deductions: Array<{ description: string; amount: string }>;
  }>({ earnings: [], deductions: [] });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchInvoices();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, filterMonth, filterYear]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        employees (
          employee_id,
          full_name,
          designation
        )
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('date_issued', { ascending: false });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
      return;
    }
    
    setInvoices(data || []);
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.employees.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.employees.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterMonth !== 'all') {
      filtered = filtered.filter(inv => inv.month === parseInt(filterMonth));
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(inv => inv.year === parseInt(filterYear));
    }

    setFilteredInvoices(filtered);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    setIsDownloading(true);

    try {
      // Fetch line items
      const { data: lineItems, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;

      const earnings = lineItems
        ?.filter(item => item.item_type === 'earning')
        .map(item => ({
          description: item.description,
          amount: item.amount.toString()
        })) || [];

      const deductions = lineItems
        ?.filter(item => item.item_type === 'deduction')
        .map(item => ({
          description: item.description,
          amount: item.amount.toString()
        })) || [];

      // Store line items and invoice for rendering
      setSelectedInvoiceLineItems({ earnings, deductions });
      setSelectedInvoice(invoice);

      // Wait for DOM to update
      setTimeout(async () => {
        const element = document.getElementById('invoice-download-template');
        if (!element) {
          throw new Error('Invoice template not found');
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${invoice.invoice_number}.pdf`);

        setSelectedInvoice(null);
        setIsDownloading(false);

        toast({
          title: "Success",
          description: "Invoice downloaded successfully"
        });
      }, 100);

    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive"
      });
      setIsDownloading(false);
      setSelectedInvoice(null);
    }
  };

  const uniqueYears = Array.from(new Set(invoices.map(inv => inv.year))).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/invoice-statistics')}>
              <BarChart className="h-4 w-4 mr-2" />
              View Statistics
            </Button>
            <Button onClick={() => navigate('/generate-invoice')}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by name, ID, or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month/Year</TableHead>
                  <TableHead className="text-right">Gross Payment</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Payment</TableHead>
                  <TableHead className="text-right">Total Savings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.employees.full_name}</div>
                        <div className="text-sm text-muted-foreground">{invoice.employees.employee_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.year, invoice.month - 1).toLocaleString('default', { month: 'short' })} {invoice.year}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.gross_payment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.total_deductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{invoice.net_payment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.total_savings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={isDownloading}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Hidden Invoice Template for Download */}
        {selectedInvoice && (
          <div className="fixed top-0 left-[-9999px]" id="invoice-download-template">
            <InvoiceTemplate
              employee={{
                employee_id: selectedInvoice.employees.employee_id,
                full_name: selectedInvoice.employees.full_name,
                designation: selectedInvoice.employees.designation
              }}
              invoiceNumber={selectedInvoice.invoice_number}
              slipNumber={selectedInvoice.slip_number}
              month={selectedInvoice.month}
              year={selectedInvoice.year}
              dateIssued={selectedInvoice.date_issued}
              earnings={selectedInvoiceLineItems.earnings}
              deductions={selectedInvoiceLineItems.deductions}
              totals={{
                grossPayment: selectedInvoice.gross_payment,
                totalDeductions: selectedInvoice.total_deductions,
                netPayment: selectedInvoice.net_payment,
                totalSavings: selectedInvoice.total_savings
              }}
              additionalFields={{
                totalMonthlyIncome: selectedInvoice.total_monthly_income.toString(),
                outstandingIou: selectedInvoice.outstanding_iou.toString(),
                downPayment: selectedInvoice.down_payment.toString(),
                egf: selectedInvoice.egf.toString()
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
