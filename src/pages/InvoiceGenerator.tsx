import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Download, ArrowLeft, Mail, Calculator, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate } from '@/components/InvoiceTemplate';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateMonthlyPAYE, getPAYEBreakdown, formatNaira } from '@/utils/payeCalculator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  email?: string;
}
interface LineItem {
  id: string;
  description: string;
  amount: string;
  isTaxable?: boolean;
}
const InvoiceGenerator = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get('edit');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateIssued, setDateIssued] = useState(new Date().toISOString().split('T')[0]);
  const [earnings, setEarnings] = useState<LineItem[]>([{
    id: '1',
    description: 'Salary',
    amount: '',
    isTaxable: true
  }, {
    id: '2',
    description: 'Data/Airtime Bonus',
    amount: '',
    isTaxable: false
  }, {
    id: '3',
    description: 'Personal Bonus',
    amount: '',
    isTaxable: true
  }, {
    id: '4',
    description: 'Outstanding Payment(s)',
    amount: '',
    isTaxable: true
  }]);
  
  // YTD Tax tracking state
  const [ytdTaxableIncome, setYtdTaxableIncome] = useState(0);
  const [ytdTaxPaid, setYtdTaxPaid] = useState(0);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [deductions, setDeductions] = useState<LineItem[]>([{
    id: '1',
    description: 'Tax',
    amount: ''
  }, {
    id: '2',
    description: 'Salary Advance (IOU)',
    amount: ''
  }, {
    id: '3',
    description: 'Deduction for Prior Incorrect Payment',
    amount: ''
  }, {
    id: '4',
    description: 'Penalty Charge(s)',
    amount: ''
  }, {
    id: '5',
    description: 'Down Payment',
    amount: ''
  }]);
  const [additionalFields, setAdditionalFields] = useState({
    totalMonthlyIncome: '',
    outstandingIou: '',
    downPayment: '',
    egf: ''
  });
  const [previousTotalSavings, setPreviousTotalSavings] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [includeEgf, setIncludeEgf] = useState(true);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchEmployees();
    }
  }, [user, loading, navigate]);

  // Load invoice data if in edit mode
  useEffect(() => {
    if (editInvoiceId && employees.length > 0) {
      loadInvoiceForEditing(editInvoiceId);
    }
  }, [editInvoiceId, employees]);

  // Fetch previous total savings and YTD tax data when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchPreviousTotalSavings();
      fetchYTDTaxData();
    }
  }, [selectedEmployee, month, year]);

  // Recalculate EGF and Tax when includeEgf checkbox or earnings change
  useEffect(() => {
    if (earnings.some(e => e.amount)) {
      const grossPayment = earnings.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const egfAmount = includeEgf ? (grossPayment * 0.075).toFixed(2) : '0';
      const totalMonthlyIncome = (grossPayment + parseFloat(egfAmount)).toFixed(2);
      setAdditionalFields(prev => ({
        ...prev,
        egf: egfAmount,
        totalMonthlyIncome: totalMonthlyIncome
      }));
      
      // Recalculate PAYE tax
      recalculatePAYETax(earnings);
    }
  }, [includeEgf, earnings, ytdTaxableIncome, ytdTaxPaid, month]);
  
  // Function to fetch YTD taxable income and tax paid
  const fetchYTDTaxData = async () => {
    if (!selectedEmployee) {
      setYtdTaxableIncome(0);
      setYtdTaxPaid(0);
      return;
    }
    
    try {
      // Fetch all invoices for this employee in the current year BEFORE the current month
      const { data: previousInvoices, error } = await (supabase as any)
        .from('invoices')
        .select('id, month, taxable_income, gross_payment')
        .eq('employee_id', selectedEmployee.id)
        .eq('year', year)
        .lt('month', month)
        .order('month', { ascending: true });
      
      if (error) {
        console.error('Error fetching YTD tax data:', error);
        return;
      }
      
      if (!previousInvoices || previousInvoices.length === 0) {
        setYtdTaxableIncome(0);
        setYtdTaxPaid(0);
        return;
      }
      
      // Fetch line items for these invoices to calculate taxable income and tax paid
      const invoiceIds = previousInvoices.map(inv => inv.id);
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('invoice_id, item_type, amount, is_taxable, description')
        .in('invoice_id', invoiceIds);
      
      if (lineItemsError) {
        console.error('Error fetching line items for YTD:', lineItemsError);
        return;
      }
      
      // Calculate YTD taxable income (sum of taxable earnings from previous months)
      let totalYtdTaxableIncome = 0;
      let totalYtdTaxPaid = 0;
      
      for (const invoice of previousInvoices) {
        const invoiceLineItems = lineItems?.filter(li => li.invoice_id === invoice.id) || [];
        
        // Sum taxable earnings (is_taxable = true or null for backwards compatibility with old data)
        const taxableEarnings = invoiceLineItems
          .filter(li => li.item_type === 'earning' && (li.is_taxable === true || li.is_taxable === null))
          .reduce((sum, li) => sum + (li.amount || 0), 0);
        
        // If no line items have is_taxable set, use the stored taxable_income or gross_payment as fallback
        if (invoiceLineItems.filter(li => li.item_type === 'earning').every(li => li.is_taxable === null)) {
          totalYtdTaxableIncome += invoice.taxable_income || invoice.gross_payment || 0;
        } else {
          totalYtdTaxableIncome += taxableEarnings;
        }
        
        // Sum tax deductions (Tax line item)
        const taxDeduction = invoiceLineItems
          .filter(li => li.item_type === 'deduction' && li.description?.toLowerCase() === 'tax')
          .reduce((sum, li) => sum + (li.amount || 0), 0);
        
        totalYtdTaxPaid += taxDeduction;
      }
      
      setYtdTaxableIncome(totalYtdTaxableIncome);
      setYtdTaxPaid(totalYtdTaxPaid);
    } catch (error) {
      console.error('Error in fetchYTDTaxData:', error);
    }
  };
  
  // Function to recalculate PAYE tax based on current taxable earnings
  const recalculatePAYETax = useCallback((currentEarnings: LineItem[]) => {
    // Calculate current month's taxable income
    const currentMonthTaxableIncome = currentEarnings
      .filter(e => e.isTaxable && e.amount)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Calculate PAYE using annualization method
    const monthlyPAYE = calculateMonthlyPAYE(
      ytdTaxableIncome,
      currentMonthTaxableIncome,
      month,
      ytdTaxPaid
    );
    
    // Update Tax deduction automatically
    setDeductions(prev => prev.map(item => 
      item.description === 'Tax' ? {
        ...item,
        amount: monthlyPAYE.toFixed(2)
      } : item
    ));
  }, [ytdTaxableIncome, ytdTaxPaid, month]);
  
  // Toggle taxable status for an earning item
  const toggleTaxable = (id: string, checked: boolean) => {
    const updatedEarnings = earnings.map(item => 
      item.id === id ? { ...item, isTaxable: checked } : item
    );
    setEarnings(updatedEarnings);
  };
  
  // Get current month's taxable income for display
  const getCurrentMonthTaxableIncome = () => {
    return earnings
      .filter(e => e.isTaxable && e.amount)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };
  
  // Get PAYE breakdown for display
  const getPAYEBreakdownInfo = () => {
    const currentMonthTaxableIncome = getCurrentMonthTaxableIncome();
    return getPAYEBreakdown(ytdTaxableIncome, currentMonthTaxableIncome, month, ytdTaxPaid);
  };
  const fetchPreviousTotalSavings = async () => {
    if (!selectedEmployee) return;

    // Get the most recent invoice for this employee before the current month/year
    const {
      data,
      error
    } = await supabase.from('invoices').select('total_savings').eq('employee_id', selectedEmployee.id).order('year', {
      ascending: false
    }).order('month', {
      ascending: false
    }).limit(1);
    if (!error && data && data.length > 0) {
      setPreviousTotalSavings(data[0].total_savings || 0);
    } else {
      setPreviousTotalSavings(0);
    }
  };
  const fetchEmployees = async () => {
    const {
      data,
      error
    } = await supabase.from('employees').select('id, employee_id, full_name, designation, email').order('full_name');
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
      return;
    }
    setEmployees(data || []);
  };
  const loadInvoiceForEditing = async (invoiceId: string) => {
    try {
      // Fetch invoice data
      const {
        data: invoiceData,
        error: invoiceError
      } = await supabase.from('invoices').select(`
          *,
          employees (
            id,
            employee_id,
            full_name,
            designation
          )
        `).eq('id', invoiceId).single();
      if (invoiceError) throw invoiceError;

      // Fetch line items
      const {
        data: lineItems,
        error: lineItemsError
      } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoiceId);
      if (lineItemsError) throw lineItemsError;

      // Set invoice data
      setIsEditMode(true);
      setEditingInvoiceId(invoiceId);
      setSelectedEmployee(invoiceData.employees as Employee);
      setMonth(invoiceData.month);
      setYear(invoiceData.year);
      setDateIssued(invoiceData.date_issued);

      // Set earnings with is_taxable flag
      const earningsData = lineItems?.filter(item => item.item_type === 'earning').map((item, idx) => ({
        id: (idx + 1).toString(),
        description: item.description,
        amount: item.amount.toString(),
        isTaxable: item.is_taxable !== false // Default to true for backwards compatibility
      })) || [];
      setEarnings(earningsData.length > 0 ? earningsData : [{
        id: '1',
        description: 'Salary',
        amount: '',
        isTaxable: true
      }]);

      // Set deductions
      const deductionsData = lineItems?.filter(item => item.item_type === 'deduction').map((item, idx) => ({
        id: (idx + 1).toString(),
        description: item.description,
        amount: item.amount.toString()
      })) || [];
      setDeductions(deductionsData.length > 0 ? deductionsData : [{
        id: '1',
        description: 'Tax',
        amount: ''
      }]);

      // Set additional fields
      setAdditionalFields({
        totalMonthlyIncome: invoiceData.total_monthly_income.toString(),
        outstandingIou: invoiceData.outstanding_iou.toString(),
        downPayment: invoiceData.down_payment.toString(),
        egf: invoiceData.egf.toString()
      });
      toast({
        title: "Payslip Loaded",
        description: "You are now editing an existing payslip"
      });
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load payslip for editing",
        variant: "destructive"
      });
    }
  };
  const addLineItem = (type: 'earnings' | 'deductions') => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      amount: '',
      isTaxable: type === 'earnings' ? true : undefined
    };
    if (type === 'earnings') {
      setEarnings([...earnings, newItem]);
    } else {
      setDeductions([...deductions, newItem]);
    }
  };
  const removeLineItem = (type: 'earnings' | 'deductions', id: string) => {
    if (type === 'earnings') {
      setEarnings(earnings.filter(item => item.id !== id));
    } else {
      setDeductions(deductions.filter(item => item.id !== id));
    }
  };
  const updateLineItem = (type: 'earnings' | 'deductions', id: string, field: 'description' | 'amount', value: string) => {
    const updateFn = (items: LineItem[]) => items.map(item => item.id === id ? {
      ...item,
      [field]: value
    } : item);
    if (type === 'earnings') {
      const updatedEarnings = updateFn(earnings);
      setEarnings(updatedEarnings);

      // Auto-calculate PAYE Tax and EGF when amount changes
      if (field === 'amount') {
        const grossPayment = updatedEarnings.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const egfAmount = includeEgf ? (grossPayment * 0.075).toFixed(2) : '0'; // 7.5% if enabled
        const totalMonthlyIncome = (grossPayment + parseFloat(egfAmount)).toFixed(2);

        // Calculate taxable income for this month
        const currentMonthTaxableIncome = updatedEarnings
          .filter(e => e.isTaxable && e.amount)
          .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        // Calculate PAYE using Nigerian tax bands and annualization
        const monthlyPAYE = calculateMonthlyPAYE(
          ytdTaxableIncome,
          currentMonthTaxableIncome,
          month,
          ytdTaxPaid
        );

        // Update Tax deduction automatically
        setDeductions(prev => prev.map(item => item.description === 'Tax' ? {
          ...item,
          amount: monthlyPAYE.toFixed(2)
        } : item));

        // Update EGF and Total Monthly Income
        setAdditionalFields(prev => ({
          ...prev,
          egf: egfAmount,
          totalMonthlyIncome: totalMonthlyIncome
        }));
      }
    } else {
      setDeductions(updateFn(deductions));
    }
  };
  const calculateTotals = () => {
    const grossPayment = earnings.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const netPayment = grossPayment - totalDeductions;
    // Total Savings = Previous Total Savings + current EGF + Down Payment
    const totalSavings = previousTotalSavings + (parseFloat(additionalFields.egf) || 0) + (parseFloat(additionalFields.downPayment) || 0);
    return {
      grossPayment,
      totalDeductions,
      netPayment,
      totalSavings
    };
  };
  const generateInvoiceNumber = () => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(2);
    return `${yearStr}${monthStr}FDL${yearStr}${monthStr}-${selectedEmployee?.employee_id || '000'}`;
  };
  const generateSlipNumber = () => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString();
    const monthName = new Date(year, month - 1).toLocaleString('default', {
      month: 'short'
    }).toUpperCase();
    return `FDL-${selectedEmployee?.employee_id || '000'}-${monthName}${yearStr}`;
  };
  const handlePreview = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }
    const hasValidEarnings = earnings.some(e => e.description && e.amount);
    if (!hasValidEarnings) {
      toast({
        title: "Error",
        description: "Please add at least one earning entry",
        variant: "destructive"
      });
      return;
    }
    setShowPreview(true);
  };
  const handleSaveAndDownload = async () => {
    if (!selectedEmployee) return;
    setIsGenerating(true);
    try {
      const totals = calculateTotals();
      const invoiceNumber = generateInvoiceNumber();
      const slipNumber = generateSlipNumber();
      
      // Calculate taxable income for this month
      const currentMonthTaxableIncome = earnings
        .filter(e => e.isTaxable && e.amount)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      let invoiceData;
      if (isEditMode && editingInvoiceId) {
        // Update existing invoice
        const {
          data: updatedInvoice,
          error: updateError
        } = await supabase.from('invoices').update({
          employee_id: selectedEmployee.id,
          month,
          year,
          date_issued: dateIssued,
          gross_payment: totals.grossPayment,
          total_deductions: totals.totalDeductions,
          net_payment: totals.netPayment,
          total_monthly_income: parseFloat(additionalFields.totalMonthlyIncome) || 0,
          outstanding_iou: parseFloat(additionalFields.outstandingIou) || 0,
          down_payment: parseFloat(additionalFields.downPayment) || 0,
          egf: parseFloat(additionalFields.egf) || 0,
          total_savings: totals.totalSavings,
          taxable_income: currentMonthTaxableIncome,
          ytd_taxable_income: ytdTaxableIncome,
          ytd_tax_paid: ytdTaxPaid
        }).eq('id', editingInvoiceId).select().single();
        if (updateError) throw updateError;
        invoiceData = updatedInvoice;

        // Delete existing line items
        const {
          error: deleteError
        } = await supabase.from('invoice_line_items').delete().eq('invoice_id', editingInvoiceId);
        if (deleteError) throw deleteError;
      } else {
        // Create new invoice
        const {
          data: newInvoice,
          error: invoiceError
        } = await supabase.from('invoices').insert({
          employee_id: selectedEmployee.id,
          invoice_number: invoiceNumber,
          slip_number: slipNumber,
          month,
          year,
          date_issued: dateIssued,
          gross_payment: totals.grossPayment,
          total_deductions: totals.totalDeductions,
          net_payment: totals.netPayment,
          total_monthly_income: parseFloat(additionalFields.totalMonthlyIncome) || 0,
          outstanding_iou: parseFloat(additionalFields.outstandingIou) || 0,
          down_payment: parseFloat(additionalFields.downPayment) || 0,
          egf: parseFloat(additionalFields.egf) || 0,
          total_savings: totals.totalSavings,
          taxable_income: currentMonthTaxableIncome,
          ytd_taxable_income: ytdTaxableIncome,
          ytd_tax_paid: ytdTaxPaid,
          created_by: user?.id
        }).select().single();
        if (invoiceError) throw invoiceError;
        invoiceData = newInvoice;
      }

      // Save line items with is_taxable flag for earnings
      const lineItems = [
        ...earnings.filter(e => e.description && e.amount).map(e => ({
          invoice_id: invoiceData.id,
          item_type: 'earning' as const,
          description: e.description,
          amount: parseFloat(e.amount),
          is_taxable: e.isTaxable ?? true,
          created_by: user?.id
        })), 
        ...deductions.filter(d => d.description && d.amount).map(d => ({
          invoice_id: invoiceData.id,
          item_type: 'deduction' as const,
          description: d.description,
          amount: parseFloat(d.amount),
          is_taxable: null,
          created_by: user?.id
        }))
      ];
      if (lineItems.length > 0) {
        const {
          error: itemsError
        } = await supabase.from('invoice_line_items').insert(lineItems);
        if (itemsError) throw itemsError;
      }

      // Auto-deduct approved salary advances for this employee
      try {
        const sdb = supabase as any;
        if (selectedEmployee.user_id) {
          const { data: advances } = await sdb
            .from('advance_requests')
            .select('*')
            .eq('user_id', selectedEmployee.user_id)
            .eq('kind', 'salary_advance')
            .eq('status', 'approved');
          let addedDeductions = 0;
          for (const adv of (advances ?? [])) {
            const installments = adv.repayment_plan === 'two' ? 2 : 1;
            const perInstallment = Number(adv.amount) / installments;
            const remaining = installments - (adv.repaid_count || 0);
            if (remaining <= 0) continue;
            const deductAmount = perInstallment;
            await sdb.from('invoice_line_items').insert({
              invoice_id: invoiceData.id,
              item_type: 'deduction',
              description: `Salary advance repayment ${(adv.repaid_count || 0) + 1}/${installments}`,
              amount: deductAmount,
              is_taxable: null,
              created_by: user?.id,
            });
            await sdb.from('advance_repayments').insert({
              advance_id: adv.id,
              invoice_id: invoiceData.id,
              amount: deductAmount,
            });
            const newCount = (adv.repaid_count || 0) + 1;
            await sdb.from('advance_requests').update({
              repaid_count: newCount,
              status: newCount >= installments ? 'repaid' : 'approved',
            }).eq('id', adv.id);
            addedDeductions += deductAmount;
          }
          if (addedDeductions > 0) {
            await sdb.from('invoices').update({
              total_deductions: totals.totalDeductions + addedDeductions,
              net_payment: totals.netPayment - addedDeductions,
            }).eq('id', invoiceData.id);
          }
        }
      } catch (e) {
        console.error('Advance auto-deduction failed:', e);
      }

      // Auto-create daily expense entry for payslip (net payment including savings)
      await supabase.from('daily_transactions').insert({
        date: dateIssued,
        type: 'expense',
        category: 'Payroll',
        description: `Payslip - ${selectedEmployee.full_name} (${month}/${year})`,
        amount: totals.netPayment,
        reference_id: invoiceData.id,
        reference_type: 'invoice',
        is_auto_generated: true,
        created_by: user?.id,
        metadata: {
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.full_name,
          invoice_number: invoiceNumber,
          slip_number: slipNumber,
          gross_payment: totals.grossPayment,
          total_deductions: totals.totalDeductions,
          total_savings: totals.totalSavings
        }
      });

      // Generate PDF - wait a bit for template to fully render
      await new Promise(resolve => setTimeout(resolve, 800));
      const element = document.getElementById('invoice-template');
      if (!element) throw new Error('Invoice template not found');
      
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
      
      pdf.save(`${invoiceNumber}.pdf`);

      // Send email if checkbox is checked
      if (sendEmail && selectedEmployee.email) {
        setIsSendingEmail(true);
        try {
          const pdfBase64 = pdf.output('dataurlstring');
          const {
            error: emailError
          } = await supabase.functions.invoke('send-payslip-email', {
            body: {
              employeeName: selectedEmployee.full_name,
              employeeEmail: selectedEmployee.email,
              employeeId: selectedEmployee.employee_id,
              month,
              year,
              invoiceNumber,
              slipNumber,
              grossPayment: totals.grossPayment,
              netPayment: totals.netPayment,
              totalDeductions: totals.totalDeductions,
              pdfBase64
            }
          });
          if (emailError) {
            console.error('Email sending error:', emailError);
            toast({
              title: "Warning",
              description: "Payslip saved but email could not be sent. " + emailError.message,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Success",
              description: isEditMode ? "Payslip updated and email sent successfully" : "Payslip generated and email sent successfully"
            });
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          toast({
            title: "Warning",
            description: "Payslip saved but email could not be sent",
            variant: "destructive"
          });
        } finally {
          setIsSendingEmail(false);
        }
      } else {
        toast({
          title: "Success",
          description: isEditMode ? "Payslip updated successfully" : "Payslip generated and saved successfully"
        });
      }

      // Navigate back to invoice list or reset form
      if (isEditMode) {
        navigate('/invoices');
      } else {
        // Reset form
        setShowPreview(false);
        setSelectedEmployee(null);
        setEarnings([{
          id: '1',
          description: 'Salary',
          amount: '',
          isTaxable: true
        }, {
          id: '2',
          description: 'Data/Airtime Bonus',
          amount: '',
          isTaxable: false
        }, {
          id: '3',
          description: 'Personal Bonus',
          amount: '',
          isTaxable: true
        }, {
          id: '4',
          description: 'Outstanding Payment(s)',
          amount: '',
          isTaxable: true
        }]);
        setDeductions([{
          id: '1',
          description: 'Tax',
          amount: ''
        }, {
          id: '2',
          description: 'Salary Advance (IOU)',
          amount: ''
        }, {
          id: '3',
          description: 'Deduction for Prior Incorrect Payment',
          amount: ''
        }, {
          id: '4',
          description: 'Penalty Charge(s)',
          amount: ''
        }, {
          id: '5',
          description: 'Down Payment',
          amount: ''
        }]);
        setAdditionalFields({
          totalMonthlyIncome: '',
          outstandingIou: '',
          downPayment: '',
          egf: ''
        });
        setPreviousTotalSavings(0);
        setYtdTaxableIncome(0);
        setYtdTaxPaid(0);
        setIsEditMode(false);
        setEditingInvoiceId(null);
        setSendEmail(false);
        setIncludeEgf(true);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      const err: any = error;
      const errorMessage = typeof err?.message === 'string' ? err.message : 'Failed to generate PDF';
      const isDuplicateError = err?.code === '23505' || errorMessage.toLowerCase().includes('duplicate key');
      if (isDuplicateError && selectedEmployee) {
        // Find the existing invoice for this employee/month/year
        const {
          data: existingInvoice
        } = await supabase.from('invoices').select('id').eq('employee_id', selectedEmployee.id).eq('month', month).eq('year', year).maybeSingle();
        if (existingInvoice) {
          setExistingInvoiceId(existingInvoice.id);
          setShowDuplicateDialog(true);
        } else {
          toast({
            title: 'Error',
            description: 'A payslip for this employee and month already exists. Please edit it or choose a different month.',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };
  const totals = calculateTotals();
  return <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-base text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/invoices')}>
              View All Payslips
            </Button>
            <Button variant="outline" onClick={() => navigate('/employees')}>
              Manage Employees
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Payslip' : 'Generate Payslip'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee?.id || ''} onValueChange={value => {
                const emp = employees.find(e => e.id === value);
                setSelectedEmployee(emp || null);
              }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_id})
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={v => setMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({
                    length: 12
                  }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleString('default', {
                      month: 'long'
                    })}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Issued</Label>
              <Input type="date" value={dateIssued} onChange={e => setDateIssued(e.target.value)} />
            </div>

            {/* Earnings Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Earnings</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Check the "Taxable" box for each earning that should be included in PAYE tax calculation. Non-taxable items (like allowances) won't be included in annual tax estimates.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button type="button" size="sm" onClick={() => addLineItem('earnings')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
              
              {/* Header row for earnings */}
              <div className="flex gap-2 text-sm font-medium text-muted-foreground">
                <div className="w-16 text-center">Taxable</div>
                <div className="flex-1">Description</div>
                <div className="w-32">Amount (₦)</div>
                <div className="w-10"></div>
              </div>
              
              {earnings.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <div className="w-16 flex justify-center">
                    <Checkbox 
                      checked={item.isTaxable ?? true}
                      onCheckedChange={(checked) => toggleTaxable(item.id, checked as boolean)}
                      aria-label={`Mark ${item.description || 'this item'} as taxable`}
                    />
                  </div>
                  <div className="flex-1">
                    <Input placeholder="Description (e.g., Entered Names @ rate)" value={item.description} onChange={e => updateLineItem('earnings', item.id, 'description', e.target.value)} />
                  </div>
                  <div className="w-32">
                    <Input type="number" placeholder="Amount" value={item.amount} onChange={e => updateLineItem('earnings', item.id, 'amount', e.target.value)} />
                  </div>
                  {earnings.length > 1 ? (
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeLineItem('earnings', item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : <div className="w-10"></div>}
                </div>
              ))}
              
              <div className="flex justify-between items-start pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  <span>Taxable Income: ₦{getCurrentMonthTaxableIncome().toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right font-semibold">
                  Gross Payment: ₦{totals.grossPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* PAYE Tax Calculation Breakdown */}
            <Collapsible open={showTaxBreakdown} onOpenChange={setShowTaxBreakdown}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    PAYE Tax Calculation Details
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {showTaxBreakdown ? 'Hide' : 'Show'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  {(() => {
                    const breakdown = getPAYEBreakdownInfo();
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-muted-foreground">YTD Taxable Income (prior months):</span>
                          <span className="text-right font-medium">{formatNaira(ytdTaxableIncome)}</span>
                          
                          <span className="text-muted-foreground">This Month's Taxable Income:</span>
                          <span className="text-right font-medium">{formatNaira(getCurrentMonthTaxableIncome())}</span>
                          
                          <span className="text-muted-foreground">Total YTD (incl. this month):</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.totalYtdIncome)}</span>
                          
                          <span className="text-muted-foreground">Average Monthly Income:</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.averageMonthlyIncome)}</span>
                          
                          <span className="text-muted-foreground">Estimated Annual Income:</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.estimatedAnnualIncome)}</span>
                          
                          <span className="text-muted-foreground">Tax Band Applied:</span>
                          <span className="text-right font-medium">{breakdown.taxBandApplied}</span>
                          
                          <span className="text-muted-foreground">Estimated Annual Tax:</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.estimatedAnnualTax)}</span>
                          
                          <span className="text-muted-foreground">Monthly Tax Portion (÷12):</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.monthlyTaxPortion)}</span>
                          
                          <span className="text-muted-foreground">Cumulative Tax Due (Month {month}):</span>
                          <span className="text-right font-medium">{formatNaira(breakdown.cumulativeTaxDue)}</span>
                          
                          <span className="text-muted-foreground">YTD Tax Already Paid:</span>
                          <span className="text-right font-medium">{formatNaira(ytdTaxPaid)}</span>
                        </div>
                        
                        <div className="border-t pt-3 flex justify-between items-center">
                          <span className="font-semibold">This Month's PAYE Tax:</span>
                          <span className="text-lg font-bold text-primary">{formatNaira(breakdown.thisMonthPaye)}</span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          PAYE is calculated using annualization: income is projected for the full year, tax bands are applied, then monthly portions are calculated. This self-corrects as income fluctuates.
                        </p>
                      </>
                    );
                  })()}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Deductions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Deductions</h3>
                <Button type="button" size="sm" onClick={() => addLineItem('deductions')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
              
              {deductions.map(item => <div key={item.id} className="flex gap-2">
                  <div className="flex-1">
                    <Input placeholder="Description" value={item.description} onChange={e => updateLineItem('deductions', item.id, 'description', e.target.value)} />
                  </div>
                  <div className="w-32">
                    <Input type="number" placeholder="Amount" value={item.amount} onChange={e => updateLineItem('deductions', item.id, 'amount', e.target.value)} />
                  </div>
                  {deductions.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => removeLineItem('deductions', item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>}
                </div>)}
              
              <div className="text-right space-y-1">
                <div>Total Deductions: ₦{totals.totalDeductions.toLocaleString('en-NG', {
                  minimumFractionDigits: 2
                })}</div>
                <div className="text-lg font-bold">
                  Net Payment: ₦{totals.netPayment.toLocaleString('en-NG', {
                  minimumFractionDigits: 2
                })}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Monthly Income (Auto-calculated)</Label>
                <Input type="number" value={additionalFields.totalMonthlyIncome} readOnly className="bg-muted text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Outstanding IOU</Label>
                <Input type="number" value={additionalFields.outstandingIou} onChange={e => setAdditionalFields({
                ...additionalFields,
                outstandingIou: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label>Down Payment</Label>
                <Input type="number" value={additionalFields.downPayment} onChange={e => setAdditionalFields({
                ...additionalFields,
                downPayment: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label>EGF (Employee Gratuity Fund) - {includeEgf ? 'Auto-calculated (7.5%)' : 'Disabled'}</Label>
                <Input type="number" value={additionalFields.egf} readOnly className="bg-muted text-foreground" />
              </div>
            </div>

            {previousTotalSavings > 0 && <div className="text-sm text-muted-foreground">
                Previous Total Savings: ₦{previousTotalSavings.toLocaleString('en-NG', {
              minimumFractionDigits: 2
            })}
              </div>}

            <div className="text-right font-semibold">
              Total Savings (Previous + EGF + Down Payment): ₦{totals.totalSavings.toLocaleString('en-NG', {
              minimumFractionDigits: 2
            })}
            </div>

            {/* EGF Option */}
            <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
              <Checkbox id="include-egf" checked={includeEgf} onCheckedChange={checked => setIncludeEgf(checked as boolean)} />
              <Label htmlFor="include-egf" className="text-sm cursor-pointer text-foreground">
                Include Employee Gratuity Fund (EGF) - 7.5% of Gross Payment
              </Label>
            </div>

            {/* Email Option */}
            {selectedEmployee?.email && <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <Checkbox id="send-email" checked={sendEmail} onCheckedChange={checked => setSendEmail(checked as boolean)} />
                <Label htmlFor="send-email" className="text-sm cursor-pointer flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4" />
                  Send payslip via email to {selectedEmployee.email}
                </Label>
              </div>}

            <div className="flex justify-end gap-2">
              <Button onClick={handlePreview} disabled={!selectedEmployee}>
                Preview Payslip
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {showPreview && selectedEmployee && <Card>
            <CardHeader>
              <CardTitle>Payslip Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoiceTemplate employee={selectedEmployee} invoiceNumber={generateInvoiceNumber()} slipNumber={generateSlipNumber()} month={month} year={year} dateIssued={dateIssued} earnings={earnings.filter(e => e.description && e.amount)} deductions={deductions.filter(d => d.description && d.amount)} totals={totals} additionalFields={additionalFields} />
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
              if (!selectedEmployee) return;
              setIsGenerating(true);
              try {
                const totals = calculateTotals();
                const invoiceNumber = generateInvoiceNumber();
                const slipNumber = generateSlipNumber();
                
                // Calculate taxable income for this month
                const currentMonthTaxableIncome = earnings
                  .filter(e => e.isTaxable && e.amount)
                  .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                
                let invoiceData;
                if (isEditMode && editingInvoiceId) {
                  const {
                    data: updatedInvoice,
                    error: updateError
                  } = await supabase.from('invoices').update({
                    employee_id: selectedEmployee.id,
                    month,
                    year,
                    date_issued: dateIssued,
                    gross_payment: totals.grossPayment,
                    total_deductions: totals.totalDeductions,
                    net_payment: totals.netPayment,
                    total_monthly_income: parseFloat(additionalFields.totalMonthlyIncome) || 0,
                    outstanding_iou: parseFloat(additionalFields.outstandingIou) || 0,
                    down_payment: parseFloat(additionalFields.downPayment) || 0,
                    egf: parseFloat(additionalFields.egf) || 0,
                    total_savings: totals.totalSavings,
                    taxable_income: currentMonthTaxableIncome,
                    ytd_taxable_income: ytdTaxableIncome,
                    ytd_tax_paid: ytdTaxPaid
                  }).eq('id', editingInvoiceId).select().single();
                  if (updateError) throw updateError;
                  invoiceData = updatedInvoice;
                  const {
                    error: deleteError
                  } = await supabase.from('invoice_line_items').delete().eq('invoice_id', editingInvoiceId);
                  if (deleteError) throw deleteError;
                } else {
                  const {
                    data: newInvoice,
                    error: invoiceError
                  } = await supabase.from('invoices').insert({
                    employee_id: selectedEmployee.id,
                    invoice_number: invoiceNumber,
                    slip_number: slipNumber,
                    month,
                    year,
                    date_issued: dateIssued,
                    gross_payment: totals.grossPayment,
                    total_deductions: totals.totalDeductions,
                    net_payment: totals.netPayment,
                    total_monthly_income: parseFloat(additionalFields.totalMonthlyIncome) || 0,
                    outstanding_iou: parseFloat(additionalFields.outstandingIou) || 0,
                    down_payment: parseFloat(additionalFields.downPayment) || 0,
                    egf: parseFloat(additionalFields.egf) || 0,
                    total_savings: totals.totalSavings,
                    taxable_income: currentMonthTaxableIncome,
                    ytd_taxable_income: ytdTaxableIncome,
                    ytd_tax_paid: ytdTaxPaid
                  }).select().single();
                  if (invoiceError) throw invoiceError;
                  invoiceData = newInvoice;
                }
                const lineItems = [
                  ...earnings.filter(e => e.description && e.amount).map(e => ({
                    invoice_id: invoiceData.id,
                    item_type: 'earning' as const,
                    description: e.description,
                    amount: parseFloat(e.amount),
                    is_taxable: e.isTaxable ?? true
                  })), 
                  ...deductions.filter(d => d.description && d.amount).map(d => ({
                    invoice_id: invoiceData.id,
                    item_type: 'deduction' as const,
                    description: d.description,
                    amount: parseFloat(d.amount),
                    is_taxable: null
                  }))
                ];
                if (lineItems.length > 0) {
                  const {
                    error: itemsError
                  } = await supabase.from('invoice_line_items').insert(lineItems);
                  if (itemsError) throw itemsError;
                }
                toast({
                  title: "Success",
                  description: isEditMode ? "Payslip updated successfully" : "Payslip saved successfully"
                });
                if (isEditMode) {
                  navigate('/invoices');
                } else {
                  setShowPreview(false);
                  setSelectedEmployee(null);
                  setEarnings([{
                    id: '1',
                    description: 'Salary',
                    amount: '',
                    isTaxable: true
                  }, {
                    id: '2',
                    description: 'Data/Airtime Bonus',
                    amount: '',
                    isTaxable: false
                  }, {
                    id: '3',
                    description: 'Personal Bonus',
                    amount: '',
                    isTaxable: true
                  }, {
                    id: '4',
                    description: 'Outstanding Payment(s)',
                    amount: '',
                    isTaxable: true
                  }]);
                  setDeductions([{
                    id: '1',
                    description: 'Tax',
                    amount: ''
                  }, {
                    id: '2',
                    description: 'Salary Advance (IOU)',
                    amount: ''
                  }, {
                    id: '3',
                    description: 'Deduction for Prior Incorrect Payment',
                    amount: ''
                  }, {
                    id: '4',
                    description: 'Penalty Charge(s)',
                    amount: ''
                  }, {
                    id: '5',
                    description: 'Down Payment',
                    amount: ''
                  }]);
                  setAdditionalFields({
                    totalMonthlyIncome: '',
                    outstandingIou: '',
                    downPayment: '',
                    egf: ''
                  });
                  setPreviousTotalSavings(0);
                  setYtdTaxableIncome(0);
                  setYtdTaxPaid(0);
                  setIsEditMode(false);
                  setEditingInvoiceId(null);
                }
              } catch (error) {
                console.error('Error saving payslip:', error);
                toast({
                  title: "Error",
                  description: "Failed to save payslip",
                  variant: "destructive"
                });
              } finally {
                setIsGenerating(false);
              }
            }} disabled={isGenerating} variant="outline">
                  {isGenerating ? isEditMode ? 'Updating...' : 'Saving...' : isEditMode ? 'Update Only' : 'Save Only'}
                </Button>
                <Button onClick={handleSaveAndDownload} disabled={isGenerating || isSendingEmail} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isGenerating ? isEditMode ? 'Updating...' : 'Generating...' : isSendingEmail ? 'Sending Email...' : isEditMode ? 'Update & Download PDF' : 'Save & Download PDF'}
                </Button>
                {sendEmail && selectedEmployee?.email && <Button onClick={handleSaveAndDownload} disabled={isGenerating || isSendingEmail} className="gap-2" variant="secondary">
                    <Mail className="h-4 w-4" />
                    {isSendingEmail ? 'Sending...' : 'Download & Email'}
                  </Button>}
              </div>
            </CardContent>
          </Card>}
      </div>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Payslip Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A payslip for {selectedEmployee?.full_name} for {new Date(year, month - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })} already exists.
              Would you like to edit the existing payslip or continue with a different month?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setShowDuplicateDialog(false);
            setExistingInvoiceId(null);
          }}>
              Change Month
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            if (existingInvoiceId) {
              navigate(`/generate-invoice?edit=${existingInvoiceId}`);
            }
            setShowDuplicateDialog(false);
            setExistingInvoiceId(null);
          }}>
              Edit Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default InvoiceGenerator;