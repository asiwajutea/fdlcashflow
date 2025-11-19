import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp, Download, Trophy, Users, TrendingDown, DollarSign, PiggyBank, Award, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
interface EmployeeStats {
  employee_id: string;
  employee_name: string;
  total_invoices: number;
  total_gross_payment: number;
  total_deductions: number;
  total_net_payment: number;
  total_savings: number;
  average_payment: number;
  consistency_score: number;
}
interface MonthlyData {
  month: string;
  gross: number;
  deductions: number;
  net: number;
  savings: number;
}
interface MonthComparisonData {
  month: string;
  current: number;
  previous: number;
  change: number;
}
interface PeriodStats {
  total_invoices: number;
  total_gross_payment: number;
  total_deductions: number;
  total_net_payment: number;
  total_savings: number;
  average_payment: number;
}
interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'];
const InvoiceStatistics = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthComparison, setMonthComparison] = useState<MonthComparisonData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [employees, setEmployees] = useState<Array<{
    id: string;
    full_name: string;
  }>>([]);
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);

  // Period Comparison States
  const [showComparison, setShowComparison] = useState(false);
  const [period1, setPeriod1] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [period2, setPeriod2] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [period1Stats, setPeriod1Stats] = useState<PeriodStats | null>(null);
  const [period2Stats, setPeriod2Stats] = useState<PeriodStats | null>(null);
  const exportToCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Total Payslips', 'Total Gross Payment', 'Total Deductions', 'Total Net Payment', 'Total Savings', 'Average Payment', 'Consistency Score'];
    const rows = employeeStats.map(stat => [stat.employee_id, stat.employee_name, stat.total_invoices, stat.total_gross_payment, stat.total_deductions, stat.total_net_payment, stat.total_savings, stat.average_payment, stat.consistency_score.toFixed(2)]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payslip_statistics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, loading, navigate, selectedEmployee, selectedYear, selectedMonth]);
  const fetchData = async () => {
    // Fetch employees
    const {
      data: empData
    } = await supabase.from('employees').select('id, full_name').order('full_name');
    setEmployees(empData || []);

    // Build query
    const query = supabase.from('invoices').select(`
        *,
        employees (
          employee_id,
          full_name
        )
      `);
    if (selectedYear !== 'all') {
      query.eq('year', parseInt(selectedYear));
    }
    if (selectedMonth !== 'all') {
      query.eq('month', parseInt(selectedMonth));
    }
    if (selectedEmployee !== 'all') {
      query.eq('employee_id', selectedEmployee);
    }
    const {
      data: invoices,
      error
    } = await query;
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
      return;
    }

    // Calculate employee statistics with consistency score
    const statsMap = new Map<string, EmployeeStats>();
    const employeePayments = new Map<string, number[]>();
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
          total_savings: 0,
          average_payment: 0,
          consistency_score: 0
        });
        employeePayments.set(empId, []);
      }
      const stats = statsMap.get(empId)!;
      stats.total_invoices++;
      stats.total_gross_payment += invoice.gross_payment;
      stats.total_deductions += invoice.total_deductions;
      stats.total_net_payment += invoice.net_payment;
      stats.total_savings += invoice.total_savings || 0;
      employeePayments.get(empId)!.push(invoice.net_payment);
    });

    // Calculate averages and consistency scores
    statsMap.forEach((stats, empId) => {
      stats.average_payment = stats.total_net_payment / stats.total_invoices;

      // Calculate consistency score (inverse of coefficient of variation)
      const payments = employeePayments.get(empId)!;
      if (payments.length > 1) {
        const mean = stats.average_payment;
        const variance = payments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / payments.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean; // Coefficient of variation
        stats.consistency_score = Math.max(0, 100 - cv * 100); // Higher score = more consistent
      } else {
        stats.consistency_score = 100; // Perfect consistency if only one payment
      }
    });
    setEmployeeStats(Array.from(statsMap.values()));

    // Calculate monthly data
    const monthlyMap = new Map<string, MonthlyData>();
    invoices?.forEach(invoice => {
      const key = `${invoice.year}-${invoice.month.toString().padStart(2, '0')}`;
      const monthName = new Date(invoice.year, invoice.month - 1).toLocaleString('default', {
        month: 'short',
        year: 'numeric'
      });
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: monthName,
          gross: 0,
          deductions: 0,
          net: 0,
          savings: 0
        });
      }
      const data = monthlyMap.get(key)!;
      data.gross += invoice.gross_payment;
      data.deductions += invoice.total_deductions;
      data.net += invoice.net_payment;
      data.savings += invoice.total_savings || 0;
    });
    const sortedMonthly = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([_, data]) => data);
    setMonthlyData(sortedMonthly);

    // Calculate month-to-month comparison
    const comparisonData: MonthComparisonData[] = [];
    for (let i = 1; i < sortedMonthly.length; i++) {
      const current = sortedMonthly[i];
      const previous = sortedMonthly[i - 1];
      const change = (current.net - previous.net) / previous.net * 100;
      comparisonData.push({
        month: current.month,
        current: current.net,
        previous: previous.net,
        change
      });
    }
    setMonthComparison(comparisonData);

    // Get unique years and months
    const uniqueYears = Array.from(new Set(invoices?.map(inv => inv.year) || [])).sort((a, b) => b - a);
    const uniqueMonths = Array.from(new Set(invoices?.map(inv => inv.month) || [])).sort((a, b) => a - b);
    setYears(uniqueYears);
    setMonths(uniqueMonths);
  };
  const fetchPeriodComparison = async () => {
    if (!period1.from || !period1.to || !period2.from || !period2.to) {
      toast({
        title: "Please select both date ranges",
        description: "Both Period 1 and Period 2 date ranges are required for comparison.",
        variant: "destructive"
      });
      return;
    }
    const fetchPeriodData = async (from: Date, to: Date): Promise<PeriodStats> => {
      const {
        data: invoices
      } = await supabase.from('invoices').select('*').gte('date_issued', format(from, 'yyyy-MM-dd')).lte('date_issued', format(to, 'yyyy-MM-dd'));
      const stats = (invoices || []).reduce((acc, inv) => ({
        total_invoices: acc.total_invoices + 1,
        total_gross_payment: acc.total_gross_payment + Number(inv.gross_payment),
        total_deductions: acc.total_deductions + Number(inv.total_deductions),
        total_net_payment: acc.total_net_payment + Number(inv.net_payment),
        total_savings: acc.total_savings + Number(inv.total_savings),
        average_payment: 0
      }), {
        total_invoices: 0,
        total_gross_payment: 0,
        total_deductions: 0,
        total_net_payment: 0,
        total_savings: 0,
        average_payment: 0
      });
      stats.average_payment = stats.total_invoices > 0 ? stats.total_net_payment / stats.total_invoices : 0;
      return stats;
    };
    const p1Stats = await fetchPeriodData(period1.from, period1.to);
    const p2Stats = await fetchPeriodData(period2.from, period2.to);
    setPeriod1Stats(p1Stats);
    setPeriod2Stats(p2Stats);
    toast({
      title: "Comparison updated",
      description: "Period comparison has been calculated successfully."
    });
  };
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (current - previous) / previous * 100;
  };
  const totalStats = employeeStats.reduce((acc, stat) => ({
    total_invoices: acc.total_invoices + stat.total_invoices,
    total_gross_payment: acc.total_gross_payment + stat.total_gross_payment,
    total_deductions: acc.total_deductions + stat.total_deductions,
    total_net_payment: acc.total_net_payment + stat.total_net_payment,
    total_savings: acc.total_savings + stat.total_savings
  }), {
    total_invoices: 0,
    total_gross_payment: 0,
    total_deductions: 0,
    total_net_payment: 0,
    total_savings: 0
  });
  const highestPaidEmployee = employeeStats.length > 0 ? employeeStats.reduce((max, stat) => stat.total_net_payment > max.total_net_payment ? stat : max, employeeStats[0]) : null;
  const mostConsistentEmployee = employeeStats.length > 0 ? employeeStats.reduce((max, stat) => stat.consistency_score > max.consistency_score ? stat : max, employeeStats[0]) : null;
  const topEmployees = employeeStats.sort((a, b) => b.total_net_payment - a.total_net_payment).slice(0, 5).map(emp => ({
    name: emp.employee_name,
    value: emp.total_net_payment
  }));
  return <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/invoices')} className="gap-2 text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Payslips
          </Button>
          <h1 className="text-3xl font-bold text-gray-200">Payslip Analytics Dashboard</h1>
        </div>

        {/* Filters */}
        <Card className="financial-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Filter Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>)}
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
                    {years.map(year => <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(month => <SelectItem key={month} value={month.toString()}>
                        {new Date(2000, month - 1).toLocaleString('default', {
                      month: 'long'
                    })}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Mode Toggle */}
        <div className="flex justify-center">
          <Button variant={showComparison ? "default" : "outline"} onClick={() => setShowComparison(!showComparison)} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {showComparison ? 'Hide' : 'Show'} Period Comparison
          </Button>
        </div>

        {/* Period Comparison Section */}
        {showComparison && <Card className="transition-all duration-300 border border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Compare Two Time Periods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Date Range Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Period 1 */}
                  <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <h3 className="font-semibold text-lg">Period 1</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !period1.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {period1.from ? format(period1.from, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={period1.from} onSelect={date => setPeriod1({
                        ...period1,
                        from: date
                      })} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !period1.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {period1.to ? format(period1.to, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={period1.to} onSelect={date => setPeriod1({
                        ...period1,
                        to: date
                      })} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Period 2 */}
                  <div className="space-y-4 p-4 rounded-lg border border-secondary/30 bg-secondary/5">
                    <h3 className="font-semibold text-lg">Period 2</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !period2.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {period2.from ? format(period2.from, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={period2.from} onSelect={date => setPeriod2({
                        ...period2,
                        from: date
                      })} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !period2.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {period2.to ? format(period2.to, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={period2.to} onSelect={date => setPeriod2({
                        ...period2,
                        to: date
                      })} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={fetchPeriodComparison} className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Compare Periods
                  </Button>
                </div>

                {/* Comparison Results */}
                {period1Stats && period2Stats && <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg text-center mb-4">Comparison Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Total Payslips */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Total Payslips
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">{period1Stats.total_invoices}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">{period2Stats.total_invoices}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.total_invoices, period1Stats.total_invoices) >= 0 ? "text-green-600" : "text-destructive")}>
                              {calculatePercentageChange(period2Stats.total_invoices, period1Stats.total_invoices) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.total_invoices, period1Stats.total_invoices).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.total_invoices, period1Stats.total_invoices) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Gross Payment */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Gross Payment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">₦{period1Stats.total_gross_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">₦{period2Stats.total_gross_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.total_gross_payment, period1Stats.total_gross_payment) >= 0 ? "text-green-600" : "text-destructive")}>
                              {calculatePercentageChange(period2Stats.total_gross_payment, period1Stats.total_gross_payment) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.total_gross_payment, period1Stats.total_gross_payment).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.total_gross_payment, period1Stats.total_gross_payment) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Net Payment */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Net Payment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">₦{period1Stats.total_net_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">₦{period2Stats.total_net_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.total_net_payment, period1Stats.total_net_payment) >= 0 ? "text-green-600" : "text-destructive")}>
                              {calculatePercentageChange(period2Stats.total_net_payment, period1Stats.total_net_payment) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.total_net_payment, period1Stats.total_net_payment).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.total_net_payment, period1Stats.total_net_payment) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Deductions */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Total Deductions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">₦{period1Stats.total_deductions.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">₦{period2Stats.total_deductions.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.total_deductions, period1Stats.total_deductions) >= 0 ? "text-destructive" : "text-green-600")}>
                              {calculatePercentageChange(period2Stats.total_deductions, period1Stats.total_deductions) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.total_deductions, period1Stats.total_deductions).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.total_deductions, period1Stats.total_deductions) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Savings */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <PiggyBank className="h-4 w-4" />
                            Total Savings
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">₦{period1Stats.total_savings.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">₦{period2Stats.total_savings.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.total_savings, period1Stats.total_savings) >= 0 ? "text-green-600" : "text-destructive")}>
                              {calculatePercentageChange(period2Stats.total_savings, period1Stats.total_savings) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.total_savings, period1Stats.total_savings).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.total_savings, period1Stats.total_savings) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Average Payment */}
                      <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Average Payment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary">Period 1:</span>
                            <span className="font-bold">₦{period1Stats.average_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-secondary">Period 2:</span>
                            <span className="font-bold">₦{period2Stats.average_payment.toLocaleString('en-NG', {
                          minimumFractionDigits: 2
                        })}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Change:</span>
                            <span className={cn("font-bold flex items-center gap-1", calculatePercentageChange(period2Stats.average_payment, period1Stats.average_payment) >= 0 ? "text-green-600" : "text-destructive")}>
                              {calculatePercentageChange(period2Stats.average_payment, period1Stats.average_payment) >= 0 ? "+" : ""}
                              {calculatePercentageChange(period2Stats.average_payment, period1Stats.average_payment).toFixed(1)}%
                              {calculatePercentageChange(period2Stats.average_payment, period1Stats.average_payment) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>}
              </div>
            </CardContent>
          </Card>}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Payslips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalStats.total_invoices}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Gross
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_gross_payment.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Deductions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ₦{totalStats.total_deductions.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Net
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_net_payment.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Total Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{totalStats.total_savings.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Performance Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highestPaidEmployee && <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Highest Paid Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xl font-bold">{highestPaidEmployee.employee_name}</div>
                <div className="text-sm text-muted-foreground">ID: {highestPaidEmployee.employee_id}</div>
                <div className="text-2xl font-bold text-primary">
                  ₦{highestPaidEmployee.total_net_payment.toLocaleString('en-NG', {
                minimumFractionDigits: 2
              })}
                </div>
                <div className="text-sm">
                  Average: ₦{highestPaidEmployee.average_payment.toLocaleString('en-NG', {
                minimumFractionDigits: 2
              })}
                </div>
              </CardContent>
            </Card>}

          {mostConsistentEmployee && <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  Most Consistent Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xl font-bold">{mostConsistentEmployee.employee_name}</div>
                <div className="text-sm text-muted-foreground">ID: {mostConsistentEmployee.employee_id}</div>
                <div className="text-2xl font-bold text-green-600">
                  {mostConsistentEmployee.consistency_score.toFixed(1)}%
                </div>
                <div className="text-sm">
                  Consistency Score (Lower deviation = higher score)
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly Trend Chart */}
          {monthlyData.length > 0 && <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Monthly Payment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₦${value.toLocaleString('en-NG', {
                  minimumFractionDigits: 2
                })}`} />
                    <Legend />
                    <Area type="monotone" dataKey="gross" stackId="1" stroke="#8884d8" fill="#8884d8" name="Gross Payment" />
                    <Area type="monotone" dataKey="deductions" stackId="2" stroke="#ff7300" fill="#ff7300" name="Deductions" />
                    <Area type="monotone" dataKey="net" stackId="3" stroke="#82ca9d" fill="#82ca9d" name="Net Payment" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>}

          {/* Top 5 Employees List */}
          {topEmployees.length > 0 && <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Top 5 Employees by Total Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topEmployees.map((employee, index) => <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-warning/20 text-warning' : index === 1 ? 'bg-muted-foreground/20 text-muted-foreground' : index === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                          #{index + 1}
                        </div>
                        <span className="font-medium">{employee.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          ₦{employee.value.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                        </div>
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Payment per Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{employeeStats.length > 0 ? (totalStats.total_net_payment / employeeStats.length).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per employee average</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deduction Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalStats.total_gross_payment > 0 ? (totalStats.total_deductions / totalStats.total_gross_payment * 100).toFixed(1) : '0.0'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Of gross payment</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employeeStats.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">With payslip records</p>
            </CardContent>
          </Card>
        </div>

        {/* Month-to-Month Comparison */}
        {monthComparison.length > 0 && <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Month-to-Month Net Payment Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number, name: string) => {
                if (name === 'change') return `${value.toFixed(2)}%`;
                return `₦${value.toLocaleString('en-NG', {
                  minimumFractionDigits: 2
                })}`;
              }} />
                  <Legend />
                  <Bar dataKey="current" fill="#82ca9d" name="Current Month" />
                  <Bar dataKey="previous" fill="#8884d8" name="Previous Month" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>}

        {/* Employee Statistics Table */}
        <Card className="transition-all duration-300 hover:shadow-lg border border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detailed Employee Payment Statistics</CardTitle>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Payslips</TableHead>
                  <TableHead className="text-right">Total Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Total Net</TableHead>
                  <TableHead className="text-right">Total Savings</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-center">Consistency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStats.map(stat => <TableRow key={stat.employee_id}>
                    <TableCell>
                      <div className="font-medium">{stat.employee_name}</div>
                      <div className="text-sm text-muted-foreground">{stat.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-center">{stat.total_invoices}</TableCell>
                    <TableCell className="text-right">
                      ₦{stat.total_gross_payment.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{stat.total_deductions.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{stat.total_net_payment.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{stat.total_savings.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{stat.average_payment.toLocaleString('en-NG', {
                    minimumFractionDigits: 2
                  })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stat.consistency_score >= 80 ? 'bg-green-100 text-green-800' : stat.consistency_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>
                        {stat.consistency_score.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>)}
                {employeeStats.length === 0 && <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No statistics available for the selected filters
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default InvoiceStatistics;