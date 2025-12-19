import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, ArrowLeft, FileText, BarChart, Pencil, Trash2, FileArchive, Receipt, Users, DollarSign, TrendingDown, PiggyBank } from 'lucide-react';
import JSZip from 'jszip';
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
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoicesForZip, setSelectedInvoicesForZip] = useState<Set<string>>(new Set());
  const [selectedInvoiceLineItems, setSelectedInvoiceLineItems] = useState<{
    earnings: Array<{
      description: string;
      amount: string;
    }>;
    deductions: Array<{
      description: string;
      amount: string;
    }>;
  }>({
    earnings: [],
    deductions: []
  });
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
    const {
      data,
      error
    } = await supabase.from('invoices').select(`
        *,
        employees (
          employee_id,
          full_name,
          designation
        )
      `).order('year', {
      ascending: false
    }).order('month', {
      ascending: false
    }).order('date_issued', {
      ascending: false
    });
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
      filtered = filtered.filter(inv => inv.employees.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || inv.employees.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
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
      const {
        data: lineItems,
        error
      } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id);
      if (error) throw error;
      const earnings = lineItems?.filter(item => item.item_type === 'earning').map(item => ({
        description: item.description,
        amount: item.amount.toString()
      })) || [];
      const deductions = lineItems?.filter(item => item.item_type === 'deduction').map(item => ({
        description: item.description,
        amount: item.amount.toString()
      })) || [];

      // Store line items and invoice for rendering
      setSelectedInvoiceLineItems({
        earnings,
        deductions
      });
      setSelectedInvoice(invoice);

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = document.getElementById('invoice-download-template');
      if (!element) {
        throw new Error('Invoice template not found');
      }
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multi-page if content is taller than one page
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfPageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }
      
      pdf.save(`${invoice.invoice_number}.pdf`);
      setSelectedInvoice(null);
      setIsDownloading(false);
      toast({
        title: "Success",
        description: "Invoice downloaded successfully"
      });
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
  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/generate-invoice?edit=${invoice.id}`);
  };
  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      // Delete line items first
      const {
        error: lineItemsError
      } = await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id);
      if (lineItemsError) throw lineItemsError;

      // Delete invoice
      const {
        error: invoiceError
      } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (invoiceError) throw invoiceError;
      toast({
        title: "Success",
        description: "Payslip deleted successfully"
      });

      // Refresh the list
      fetchInvoices();
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoicesForZip);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoicesForZip(newSelected);
  };
  const handleExportMultipleAsZip = async () => {
    if (selectedInvoicesForZip.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one payslip to export",
        variant: "destructive"
      });
      return;
    }
    setIsExportingZip(true);
    const zip = new JSZip();
    try {
      for (const invoiceId of selectedInvoicesForZip) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) continue;

        // Fetch line items
        const {
          data: lineItems,
          error
        } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id);
        if (error) throw error;
        const earnings = lineItems?.filter(item => item.item_type === 'earning').map(item => ({
          description: item.description,
          amount: item.amount.toString()
        })) || [];
        const deductions = lineItems?.filter(item => item.item_type === 'deduction').map(item => ({
          description: item.description,
          amount: item.amount.toString()
        })) || [];

        // Create a temporary container for rendering
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.id = `temp-invoice-${invoice.id}`;
        document.body.appendChild(tempDiv);

        // Render the invoice template (we'll use a simple approach here)
        // In production, you might want to use ReactDOM.render
        tempDiv.innerHTML = document.getElementById('invoice-download-template')?.innerHTML || '';
        
        const canvas = await html2canvas(tempDiv, {
          scale: 1.5,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Handle multi-page if content is taller than one page
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfPageHeight;
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfPageHeight;
        }
        const pdfBlob = pdf.output('blob');

        // Add to ZIP
        zip.file(`${invoice.invoice_number}.pdf`, pdfBlob);

        // Clean up
        document.body.removeChild(tempDiv);
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob'
      });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: `Exported ${selectedInvoicesForZip.size} invoices as ZIP`
      });
      setSelectedInvoicesForZip(new Set());
    } catch (error: any) {
      console.error('Error exporting invoices as ZIP:', error);
      toast({
        title: "Error",
        description: "Failed to export invoices as ZIP",
        variant: "destructive"
      });
    } finally {
      setIsExportingZip(false);
    }
  };

  // Calculate summary stats based on filtered invoices
  const summaryStats = {
    totalInvoices: filteredInvoices.length,
    uniqueEmployees: new Set(filteredInvoices.map(inv => inv.employees.employee_id)).size,
    totalGross: filteredInvoices.reduce((sum, inv) => sum + inv.gross_payment, 0),
    totalDeductions: filteredInvoices.reduce((sum, inv) => sum + inv.total_deductions, 0),
    totalSavings: filteredInvoices.reduce((sum, inv) => sum + inv.total_savings, 0)
  };
  const uniqueYears = Array.from(new Set(invoices.map(inv => inv.year))).sort((a, b) => b - a);
  return <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Generate Payslip
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/statistics')}>
              <BarChart className="h-4 w-4 mr-2" />
              View Statistics
            </Button>
            <Button onClick={() => navigate('/generate-invoice')}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Payslip
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalInvoices}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueEmployees}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross</CardTitle>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                ₦{summaryStats.totalGross.toLocaleString('en-NG', {
                minimumFractionDigits: 0
              })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                ₦{summaryStats.totalDeductions.toLocaleString('en-NG', {
                minimumFractionDigits: 0
              })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Savings</CardTitle>
                <PiggyBank className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                ₦{summaryStats.totalSavings.toLocaleString('en-NG', {
                minimumFractionDigits: 0
              })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payslip History</CardTitle>
            {selectedInvoicesForZip.size > 0 && <Button onClick={handleExportMultipleAsZip} disabled={isExportingZip} className="gap-2">
                <FileArchive className="h-4 w-4" />
                {isExportingZip ? 'Exporting...' : `Export ${selectedInvoicesForZip.size} as ZIP`}
              </Button>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Search by name, ID, or invoice number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({
                  length: 12
                }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('default', {
                    month: 'long'
                  })}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" checked={selectedInvoicesForZip.size === filteredInvoices.length && filteredInvoices.length > 0} onChange={() => {
                    if (selectedInvoicesForZip.size === filteredInvoices.length) {
                      setSelectedInvoicesForZip(new Set());
                    } else {
                      setSelectedInvoicesForZip(new Set(filteredInvoices.map(inv => inv.id)));
                    }
                  }} className="cursor-pointer" />
                  </TableHead>
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
                {filteredInvoices.map(invoice => <TableRow key={invoice.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedInvoicesForZip.has(invoice.id)} onChange={() => toggleInvoiceSelection(invoice.id)} className="cursor-pointer" />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.employees.full_name}</div>
                        <div className="text-sm text-muted-foreground">{invoice.employees.employee_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.year, invoice.month - 1).toLocaleString('default', {
                    month: 'short'
                  })} {invoice.year}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.gross_payment.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.total_deductions.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{invoice.net_payment.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{invoice.total_savings.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadInvoice(invoice)} disabled={isDownloading || isDeleting} className="gap-1">
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditInvoice(invoice)} disabled={isDownloading || isDeleting} className="gap-1">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteInvoice(invoice)} disabled={isDownloading || isDeleting} className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
                {filteredInvoices.length === 0 && <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Hidden Invoice Template for Download */}
        {selectedInvoice && <div className="fixed top-0 left-[-9999px]" id="invoice-download-template">
            <InvoiceTemplate employee={{
          employee_id: selectedInvoice.employees.employee_id,
          full_name: selectedInvoice.employees.full_name,
          designation: selectedInvoice.employees.designation
        }} invoiceNumber={selectedInvoice.invoice_number} slipNumber={selectedInvoice.slip_number} month={selectedInvoice.month} year={selectedInvoice.year} dateIssued={selectedInvoice.date_issued} earnings={selectedInvoiceLineItems.earnings} deductions={selectedInvoiceLineItems.deductions} totals={{
          grossPayment: selectedInvoice.gross_payment,
          totalDeductions: selectedInvoice.total_deductions,
          netPayment: selectedInvoice.net_payment,
          totalSavings: selectedInvoice.total_savings
        }} additionalFields={{
          totalMonthlyIncome: selectedInvoice.total_monthly_income.toString(),
          outstandingIou: selectedInvoice.outstanding_iou.toString(),
          downPayment: selectedInvoice.down_payment.toString(),
          egf: selectedInvoice.egf.toString()
        }} />
          </div>}
      </div>
    </div>;
};
export default InvoiceList;