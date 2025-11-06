import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface EmployeeStats {
  employee_id: string;
  employee_name: string;
  total_invoices: number;
  total_gross_payment: number;
  total_deductions: number;
  total_net_payment: number;
  average_payment: number;
}

interface MonthlyData {
  month: string;
  gross: number;
  deductions: number;
  net: number;
}

const InvoiceStatistics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [employees, setEmployees] = useState<Array<{id: string, full_name: string}>>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate, selectedEmployee, selectedYear]);

  const fetchData = async () => {
    // Fetch employees
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name')
      .order('full_name');
    
    setEmployees(empData || []);

    // Fetch invoices
    const query = supabase
      .from('invoices')
      .select(`
        *,
        employees (
          employee_id,
          full_name
        )
      `);

    if (selectedYear !== 'all') {
      query.eq('year', parseInt(selectedYear));
    }

    if (selectedEmployee !== 'all') {
      query.eq('employee_id', selectedEmployee);
    }

    const { data: invoices, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
      return;
    }

    // Calculate employee statistics
    const statsMap = new Map<string, EmployeeStats>();
    
    invoices?.forEach(invoice => {
      const empId = invoice.employees.employee_id;
      const empName = invoice.employees.full_name;
      
      if (!statsMap.has(empId)) {
        statsMap.set(empId, {
          employee_id: empId,
          employee_name: empName,
          total_invoices: 0,
          total_gross_payment: 0,
          total_deductions: 0,
          total_net_payment: 0,
          average_payment: 0
        });
      }
      
      const stats = statsMap.get(empId)!;
      stats.total_invoices++;
      stats.total_gross_payment += invoice.gross_payment;
      stats.total_deductions += invoice.total_deductions;
      stats.total_net_payment += invoice.net_payment;
    });

    // Calculate averages
    statsMap.forEach(stats => {
      stats.average_payment = stats.total_net_payment / stats.total_invoices;
    });

    setEmployeeStats(Array.from(statsMap.values()));

    // Calculate monthly data
    const monthlyMap = new Map<string, MonthlyData>();
    
    invoices?.forEach(invoice => {
      const key = `${invoice.year}-${invoice.month.toString().padStart(2, '0')}`;
      const monthName = new Date(invoice.year, invoice.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: monthName,
          gross: 0,
          deductions: 0,
          net: 0
        });
      }
      
      const data = monthlyMap.get(key)!;
      data.gross += invoice.gross_payment;
      data.deductions += invoice.total_deductions;
      data.net += invoice.net_payment;
    });

    const sortedMonthly = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => data);

    setMonthlyData(sortedMonthly);

    // Get unique years
    const uniqueYears = Array.from(new Set(invoices?.map(inv => inv.year) || [])).sort((a, b) => b - a);
    setYears(uniqueYears);
  };

  const totalStats = employeeStats.reduce((acc, stat) => ({
    total_invoices: acc.total_invoices + stat.total_invoices,
    total_gross_payment: acc.total_gross_payment + stat.total_gross_payment,
    total_deductions: acc.total_deductions + stat.total_deductions,
    total_net_payment: acc.total_net_payment + stat.total_net_payment
  }), {
    total_invoices: 0,
    total_gross_payment: 0,
    total_deductions: 0,
    total_net_payment: 0
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/invoices')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.total_invoices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_gross_payment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_deductions.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_net_payment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="gross" stroke="#8884d8" name="Gross Payment" />
                  <Line type="monotone" dataKey="deductions" stroke="#ff7300" name="Deductions" />
                  <Line type="monotone" dataKey="net" stroke="#82ca9d" name="Net Payment" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Employee Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Total Invoices</TableHead>
                  <TableHead className="text-right">Total Gross</TableHead>
                  <TableHead className="text-right">Total Deductions</TableHead>
                  <TableHead className="text-right">Total Net</TableHead>
                  <TableHead className="text-right">Average Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStats.map((stat) => (
                  <TableRow key={stat.employee_id}>
                    <TableCell>
                      <div className="font-medium">{stat.employee_name}</div>
                      <div className="text-sm text-muted-foreground">{stat.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-center">{stat.total_invoices}</TableCell>
                    <TableCell className="text-right">
                      ₦{stat.total_gross_payment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{stat.total_deductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{stat.total_net_payment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{stat.average_payment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {employeeStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No statistics available for the selected filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceStatistics;
