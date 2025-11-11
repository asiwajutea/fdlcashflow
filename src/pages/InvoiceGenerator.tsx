import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Download, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate } from '@/components/InvoiceTemplate';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
}

interface LineItem {
  id: string;
  description: string;
  amount: string;
}

const InvoiceGenerator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get('edit');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateIssued, setDateIssued] = useState(new Date().toISOString().split('T')[0]);
  
  const [earnings, setEarnings] = useState<LineItem[]>([
    { id: '1', description: 'Salary', amount: '' },
    { id: '2', description: 'Data/Airtime Bonus', amount: '' },
    { id: '3', description: 'Personal Bonus', amount: '' },
    { id: '4', description: 'Outstanding Payment(s)', amount: '' }
  ]);
  
  const [deductions, setDeductions] = useState<LineItem[]>([
    { id: '1', description: 'Tax', amount: '' },
    { id: '2', description: 'Salary Advance (IOU)', amount: '' },
    { id: '3', description: 'Deduction for Prior Incorrect Payment', amount: '' },
    { id: '4', description: 'Penalty Charge(s)', amount: '' },
    { id: '5', description: 'Down Payment', amount: '' }
  ]);
  
  const [additionalFields, setAdditionalFields] = useState({
    totalMonthlyIncome: '',
    outstandingIou: '',
    downPayment: '',
    egf: ''
  });

  const [previousTotalSavings, setPreviousTotalSavings] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // Fetch previous total savings when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchPreviousTotalSavings();
    }
  }, [selectedEmployee, month, year]);

  const fetchPreviousTotalSavings = async () => {
    if (!selectedEmployee) return;
    
    // Get the most recent invoice for this employee before the current month/year
    const { data, error } = await supabase
      .from('invoices')
      .select('total_savings')
      .eq('employee_id', selectedEmployee.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1);
    
    if (!error && data && data.length > 0) {
      setPreviousTotalSavings(data[0].total_savings || 0);
    } else {
      setPreviousTotalSavings(0);
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name');
    
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
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          employees (
            id,
            employee_id,
            full_name,
            designation
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (lineItemsError) throw lineItemsError;

      // Set invoice data
      setIsEditMode(true);
      setEditingInvoiceId(invoiceId);
      setSelectedEmployee(invoiceData.employees as Employee);
      setMonth(invoiceData.month);
      setYear(invoiceData.year);
      setDateIssued(invoiceData.date_issued);

      // Set earnings
      const earningsData = lineItems
        ?.filter(item => item.item_type === 'earning')
        .map((item, idx) => ({
          id: (idx + 1).toString(),
          description: item.description,
          amount: item.amount.toString()
        })) || [];
      setEarnings(earningsData.length > 0 ? earningsData : [
        { id: '1', description: 'Salary', amount: '' }
      ]);

      // Set deductions
      const deductionsData = lineItems
        ?.filter(item => item.item_type === 'deduction')
        .map((item, idx) => ({
          id: (idx + 1).toString(),
          description: item.description,
          amount: item.amount.toString()
        })) || [];
      setDeductions(deductionsData.length > 0 ? deductionsData : [
        { id: '1', description: 'Tax', amount: '' }
      ]);

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
    const newItem = {
      id: Date.now().toString(),
      description: '',
      amount: ''
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
    const updateFn = (items: LineItem[]) =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item);
    
    if (type === 'earnings') {
      const updatedEarnings = updateFn(earnings);
      setEarnings(updatedEarnings);
      
      // Auto-calculate Tax (0.05% of gross payment) and EGF (7.5% of gross payment)
      if (field === 'amount') {
        const grossPayment = updatedEarnings.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const taxAmount = (grossPayment * 0.0005).toFixed(2); // 0.05%
        const egfAmount = (grossPayment * 0.075).toFixed(2); // 7.5%
        const totalMonthlyIncome = (grossPayment + parseFloat(egfAmount)).toFixed(2);
        
        // Update Tax deduction automatically
        setDeductions(prev => prev.map(item => 
          item.description === 'Tax' ? { ...item, amount: taxAmount } : item
        ));
        
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
    
    return { grossPayment, totalDeductions, netPayment, totalSavings };
  };

  const generateInvoiceNumber = () => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(2);
    return `${yearStr}${monthStr}FDL${yearStr}${monthStr}-${selectedEmployee?.employee_id || '000'}`;
  };

  const generateSlipNumber = () => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString();
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'short' }).toUpperCase();
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

      let invoiceData;

      if (isEditMode && editingInvoiceId) {
        // Update existing invoice
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
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
            total_savings: totals.totalSavings
          })
          .eq('id', editingInvoiceId)
          .select()
          .single();

        if (updateError) throw updateError;
        invoiceData = updatedInvoice;

        // Delete existing line items
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', editingInvoiceId);

        if (deleteError) throw deleteError;

      } else {
        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
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
            total_savings: totals.totalSavings
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceData = newInvoice;
      }

      // Save line items
      const lineItems = [
        ...earnings.filter(e => e.description && e.amount).map(e => ({
          invoice_id: invoiceData.id,
          item_type: 'earning' as const,
          description: e.description,
          amount: parseFloat(e.amount)
        })),
        ...deductions.filter(d => d.description && d.amount).map(d => ({
          invoice_id: invoiceData.id,
          item_type: 'deduction' as const,
          description: d.description,
          amount: parseFloat(d.amount)
        }))
      ];

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      // Generate PDF - wait a bit for template to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = document.getElementById('invoice-template');
      if (!element) throw new Error('Invoice template not found');

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceNumber}.pdf`);

      toast({
        title: "Success",
        description: isEditMode ? "Payslip updated successfully" : "Payslip generated and saved successfully"
      });

      // Navigate back to invoice list or reset form
      if (isEditMode) {
        navigate('/invoices');
      } else {
        // Reset form
        setShowPreview(false);
        setSelectedEmployee(null);
      setEarnings([
        { id: '1', description: 'Salary', amount: '' },
        { id: '2', description: 'Data/Airtime Bonus', amount: '' },
        { id: '3', description: 'Personal Bonus', amount: '' },
        { id: '4', description: 'Outstanding Payment(s)', amount: '' }
      ]);
      setDeductions([
        { id: '1', description: 'Tax', amount: '' },
        { id: '2', description: 'Salary Advance (IOU)', amount: '' },
        { id: '3', description: 'Deduction for Prior Incorrect Payment', amount: '' },
        { id: '4', description: 'Penalty Charge(s)', amount: '' },
        { id: '5', description: 'Down Payment', amount: '' }
      ]);
      setAdditionalFields({
        totalMonthlyIncome: '',
        outstandingIou: '',
        downPayment: '',
        egf: ''
        });
        setPreviousTotalSavings(0);
        setIsEditMode(false);
        setEditingInvoiceId(null);
      }

    } catch (error) {
      console.error('Error generating invoice:', error);
        toast({
          title: "Error",
          description: "Failed to generate payslip",
          variant: "destructive"
        });
    } finally {
      setIsGenerating(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
                <Select
                  value={selectedEmployee?.id || ''}
                  onValueChange={(value) => {
                    const emp = employees.find(e => e.id === value);
                    setSelectedEmployee(emp || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Issued</Label>
              <Input
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
              />
            </div>

            {/* Earnings Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Earnings</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addLineItem('earnings')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
              
              {earnings.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Description (e.g., Entered Names @ rate)"
                      value={item.description}
                      onChange={(e) => updateLineItem('earnings', item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateLineItem('earnings', item.id, 'amount', e.target.value)}
                    />
                  </div>
                  {earnings.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLineItem('earnings', item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="text-right font-semibold">
                Gross Payment: ₦{totals.grossPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Deductions</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addLineItem('deductions')}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
              
              {deductions.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem('deductions', item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateLineItem('deductions', item.id, 'amount', e.target.value)}
                    />
                  </div>
                  {deductions.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLineItem('deductions', item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="text-right space-y-1">
                <div>Total Deductions: ₦{totals.totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                <div className="text-lg font-bold">
                  Net Payment: ₦{totals.netPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Monthly Income (Auto-calculated)</Label>
                <Input
                  type="number"
                  value={additionalFields.totalMonthlyIncome}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Outstanding IOU</Label>
                <Input
                  type="number"
                  value={additionalFields.outstandingIou}
                  onChange={(e) => setAdditionalFields({...additionalFields, outstandingIou: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Down Payment</Label>
                <Input
                  type="number"
                  value={additionalFields.downPayment}
                  onChange={(e) => setAdditionalFields({...additionalFields, downPayment: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>EGF (Employee Gratuity Fund) - Auto-calculated (7.5%)</Label>
                <Input
                  type="number"
                  value={additionalFields.egf}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {previousTotalSavings > 0 && (
              <div className="text-sm text-muted-foreground">
                Previous Total Savings: ₦{previousTotalSavings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            )}

            <div className="text-right font-semibold">
              Total Savings (Previous + EGF + Down Payment): ₦{totals.totalSavings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handlePreview} disabled={!selectedEmployee}>
                Preview Payslip
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {showPreview && selectedEmployee && (
          <Card>
            <CardHeader>
              <CardTitle>Payslip Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoiceTemplate
                employee={selectedEmployee}
                invoiceNumber={generateInvoiceNumber()}
                slipNumber={generateSlipNumber()}
                month={month}
                year={year}
                dateIssued={dateIssued}
                earnings={earnings.filter(e => e.description && e.amount)}
                deductions={deductions.filter(d => d.description && d.amount)}
                totals={totals}
                additionalFields={additionalFields}
              />
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedEmployee) return;
                    setIsGenerating(true);
                    try {
                      const totals = calculateTotals();
                      const invoiceNumber = generateInvoiceNumber();
                      const slipNumber = generateSlipNumber();

                      let invoiceData;

                      if (isEditMode && editingInvoiceId) {
                        const { data: updatedInvoice, error: updateError } = await supabase
                          .from('invoices')
                          .update({
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
                            total_savings: totals.totalSavings
                          })
                          .eq('id', editingInvoiceId)
                          .select()
                          .single();

                        if (updateError) throw updateError;
                        invoiceData = updatedInvoice;

                        const { error: deleteError } = await supabase
                          .from('invoice_line_items')
                          .delete()
                          .eq('invoice_id', editingInvoiceId);

                        if (deleteError) throw deleteError;
                      } else {
                        const { data: newInvoice, error: invoiceError } = await supabase
                          .from('invoices')
                          .insert({
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
                            total_savings: totals.totalSavings
                          })
                          .select()
                          .single();

                        if (invoiceError) throw invoiceError;
                        invoiceData = newInvoice;
                      }

                      const lineItems = [
                        ...earnings.filter(e => e.description && e.amount).map(e => ({
                          invoice_id: invoiceData.id,
                          item_type: 'earning' as const,
                          description: e.description,
                          amount: parseFloat(e.amount)
                        })),
                        ...deductions.filter(d => d.description && d.amount).map(d => ({
                          invoice_id: invoiceData.id,
                          item_type: 'deduction' as const,
                          description: d.description,
                          amount: parseFloat(d.amount)
                        }))
                      ];

                      const { error: itemsError } = await supabase
                        .from('invoice_line_items')
                        .insert(lineItems);

                      if (itemsError) throw itemsError;

                      toast({
                        title: "Success",
                        description: isEditMode ? "Payslip updated successfully" : "Payslip saved successfully"
                      });

                      if (isEditMode) {
                        navigate('/invoices');
                      } else {
                        setShowPreview(false);
                        setSelectedEmployee(null);
                        setEarnings([
                          { id: '1', description: 'Salary', amount: '' },
                          { id: '2', description: 'Data/Airtime Bonus', amount: '' },
                          { id: '3', description: 'Personal Bonus', amount: '' },
                          { id: '4', description: 'Outstanding Payment(s)', amount: '' }
                        ]);
                        setDeductions([
                          { id: '1', description: 'Tax', amount: '' },
                          { id: '2', description: 'Salary Advance (IOU)', amount: '' },
                          { id: '3', description: 'Deduction for Prior Incorrect Payment', amount: '' },
                          { id: '4', description: 'Penalty Charge(s)', amount: '' },
                          { id: '5', description: 'Down Payment', amount: '' }
                        ]);
                        setAdditionalFields({
                          totalMonthlyIncome: '',
                          outstandingIou: '',
                          downPayment: '',
                          egf: ''
                        });
                        setPreviousTotalSavings(0);
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
                  }}
                  disabled={isGenerating}
                  variant="outline"
                >
                  {isGenerating ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Only' : 'Save Only')}
                </Button>
                <Button
                  onClick={handleSaveAndDownload}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? (isEditMode ? 'Updating...' : 'Generating...') : (isEditMode ? 'Update & Download PDF' : 'Save & Download PDF')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvoiceGenerator;
