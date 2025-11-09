import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Download, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate } from '@/components/InvoiceTemplate';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  email?: string;
}

interface InvoiceData {
  employeeId: string;
  earnings: { description: string; amount: number }[];
  deductions: { description: string; amount: number }[];
  additionalFields: {
    totalMonthlyIncome: number;
    outstandingIou: number;
    downPayment: number;
    egf: number;
  };
}

const BulkInvoiceGenerator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateIssued, setDateIssued] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendEmails, setSendEmails] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchEmployees();
    }
  }, [user, loading, navigate]);

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

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const toggleAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id)));
    }
  };

  const generateInvoiceNumber = (employeeId: string) => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(2);
    const timestamp = Date.now().toString().slice(-4);
    return `${yearStr}${monthStr}FDL${yearStr}${monthStr}-${employeeId}-${timestamp}`;
  };

  const generateSlipNumber = (employeeId: string) => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(2);
    const timestamp = Date.now().toString().slice(-4);
    return `${yearStr}${monthStr}FDLC${yearStr}${monthStr}-${employeeId}A-${timestamp}`;
  };

  const handleBulkGenerate = async () => {
    if (selectedEmployees.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one employee",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const employeeId of selectedEmployees) {
        try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) continue;

          const invoiceNumber = generateInvoiceNumber(employee.employee_id);
          const slipNumber = generateSlipNumber(employee.employee_id);

          // For bulk generation, use default values (can be customized per employee in future)
          const earnings = [{ description: 'Monthly Salary', amount: 0 }];
          const deductions = [{ description: 'Tax', amount: 0 }];
          
          const grossPayment = earnings.reduce((sum, item) => sum + item.amount, 0);
          const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
          const netPayment = grossPayment - totalDeductions;

          // Save to database
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              employee_id: employeeId,
              invoice_number: invoiceNumber,
              slip_number: slipNumber,
              month,
              year,
              date_issued: dateIssued,
              gross_payment: grossPayment,
              total_deductions: totalDeductions,
              net_payment: netPayment,
              total_monthly_income: 0,
              outstanding_iou: 0,
              down_payment: 0,
              egf: 0,
              total_savings: 0
            })
            .select()
            .single();

          if (invoiceError) throw invoiceError;

          // Save line items
          const lineItems = [
            ...earnings.map(e => ({
              invoice_id: invoiceData.id,
              item_type: 'earning' as const,
              description: e.description,
              amount: e.amount
            })),
            ...deductions.map(d => ({
              invoice_id: invoiceData.id,
              item_type: 'deduction' as const,
              description: d.description,
              amount: d.amount
            }))
          ];

          await supabase.from('invoice_line_items').insert(lineItems);

          // Send email if requested
          if (sendEmails && employee.email) {
            // Call edge function to send email (to be implemented)
            // await supabase.functions.invoke('send-invoice-email', {
            //   body: { invoiceId: invoiceData.id, email: employee.email }
            // });
          }

          successCount++;
        } catch (error) {
          console.error(`Error generating invoice for employee ${employeeId}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Bulk Generation Complete",
        description: `Successfully generated ${successCount} invoices${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      // Reset
      setSelectedEmployees(new Set());
      
    } catch (error) {
      console.error('Error in bulk generation:', error);
      toast({
        title: "Error",
        description: "Failed to complete bulk generation",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Invoice Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-2">
                <Label>Date Issued</Label>
                <Input
                  type="date"
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                />
              </div>
            </div>

            {/* Employee Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select Employees</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center space-x-3 p-4 border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedEmployees.has(employee.id)}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{employee.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {employee.employee_id} • {employee.designation}
                        {employee.email && ` • ${employee.email}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
              </p>
            </div>

            {/* Email Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-emails"
                checked={sendEmails}
                onCheckedChange={(checked) => setSendEmails(checked as boolean)}
              />
              <Label htmlFor="send-emails" className="text-sm font-normal cursor-pointer">
                Send invoices via email to employees (requires email addresses)
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleBulkGenerate}
                disabled={isGenerating || selectedEmployees.size === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isGenerating ? 'Generating...' : `Generate ${selectedEmployees.size} Invoice${selectedEmployees.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkInvoiceGenerator;
