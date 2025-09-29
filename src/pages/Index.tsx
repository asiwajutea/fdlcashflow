import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCards } from '@/components/MetricCards';
import { WeeklyDataEntry, WeeklyData } from '@/components/WeeklyDataEntry';
import { FinancialCharts } from '@/components/FinancialCharts';
import { ExpenseBreakdown } from '@/components/ExpenseBreakdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FileText, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [weeklyDataEntries, setWeeklyDataEntries] = useState<WeeklyData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Income rates
  const INCOME_RATES = {
    fieldWork: 90,
    dataEntry: 15,
    bacAudit: 5,
    metadataAudit: 5,
    virtualAudit: 5,
  };

  // Monthly fixed income (prorated weekly)
  const MONTHLY_BOOKLET_INCOME = 65000;
  const WEEKLY_BOOKLET_INCOME = MONTHLY_BOOKLET_INCOME / 4.33; // Average weeks per month

  // Calculate expenses for a given total names and field work names
  const calculateExpenses = (totalNames: number, fieldWorkNames: number) => {
    // Field Work–Driven Expenses (based on field work names only)
    const fieldWorkSalaries = {
      fieldAgent: 25,
      fieldManager: 10,
      bookingAgent: 5,
      fieldRelation: 3,
      clerks: 10,
      qaManager: 3,
    };

    // Production Manager rates per work type
    const productionManagerRates = {
      fieldWork: 20,  // ₦20 per field work name
      dataEntry: 2,   // ₦2 per data entry name  
      bacAudit: 2,    // ₦2 per BAC audit name
    };

    // Fixed monthly salaries (prorated weekly)
    const fixedMonthlySalaries = {
      fieldRelationSupervisor: 80000 / 4.33,
      administrativeAssistant: 45000 / 4.33,
      fieldRelationOfficers: 100000 / 4.33, // 2 people
    };

    // Other weekly expenses
    const weeklyExpenses = {
      powerPlant: 15000,
      dataSubscriptionOffice: 5000,
      dataSupport: (5000 * 10) / 4.33, // Assuming 10 staff members, monthly cost
    };

    // Calculate field work expenses (based on field work names only)
    const fieldWorkExpenseRate = Object.values(fieldWorkSalaries).reduce((sum, rate) => sum + rate, 0);
    const totalFieldWorkExpenses = fieldWorkNames * fieldWorkExpenseRate;

    // Calculate production manager costs per work type (we'll need individual counts)
    // For now, using totalNames as approximation - should be updated to use individual counts
    const avgProductionManagerRate = (
      productionManagerRates.fieldWork + 
      productionManagerRates.dataEntry + 
      productionManagerRates.bacAudit
    ) / 3;
    const productionManagerCosts = totalNames * avgProductionManagerRate;

    // Total salaries
    const totalSalaries = 
      totalFieldWorkExpenses + 
      productionManagerCosts + 
      Object.values(fixedMonthlySalaries).reduce((sum, salary) => sum + salary, 0);

    // Additional expenses as percentages
    const employeeGratuity = totalSalaries * 0.075;
    
    // Note: Logistics and Incentives are based on total monthly income, 
    // so we'll calculate them separately in the main calculation

    return {
      perNameExpenses: totalFieldWorkExpenses,
      productionManager: productionManagerCosts,
      fixedSalaries: Object.values(fixedMonthlySalaries).reduce((sum, salary) => sum + salary, 0),
      weeklyExpenses: Object.values(weeklyExpenses).reduce((sum, expense) => sum + expense, 0),
      employeeGratuity,
      totalSalaries,
    };
  };

  // Calculate metrics from weekly data
  const calculateMetrics = () => {
    const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
    
    if (!currentWeek) {
      return {
        weeklyIncome: 0,
        weeklyExpenses: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        weeklyNetCashflow: 0,
        monthlyNetCashflow: 0,
      };
    }

    // Calculate weekly income
    const weeklyIncome = 
      (currentWeek.fieldWork * INCOME_RATES.fieldWork) +
      (currentWeek.dataEntry * INCOME_RATES.dataEntry) +
      (currentWeek.bacAudit * INCOME_RATES.bacAudit) +
      (currentWeek.metadataAudit * INCOME_RATES.metadataAudit) +
      (currentWeek.virtualAudit * INCOME_RATES.virtualAudit) +
      WEEKLY_BOOKLET_INCOME;

    // Calculate total names for expense calculation
    const totalNames = 
      currentWeek.fieldWork + 
      currentWeek.dataEntry + 
      currentWeek.bacAudit + 
      currentWeek.metadataAudit + 
      currentWeek.virtualAudit;

    const expenseBreakdown = calculateExpenses(totalNames, currentWeek.fieldWork);
    
    // Calculate logistics and incentives based on weekly income (approximated)
    const logistics = weeklyIncome * 0.03;
    const incentives = weeklyIncome * 0.02;
    
    const weeklyExpenses = 
      expenseBreakdown.perNameExpenses +
      expenseBreakdown.productionManager +
      expenseBreakdown.fixedSalaries +
      expenseBreakdown.weeklyExpenses +
      expenseBreakdown.employeeGratuity +
      logistics +
      incentives;

    // Calculate monthly totals (multiply by average weeks per month)
    const monthlyIncome = weeklyIncome * 4.33;
    const monthlyExpenses = weeklyExpenses * 4.33;

    return {
      weeklyIncome,
      weeklyExpenses,
      monthlyIncome,
      monthlyExpenses,
      weeklyNetCashflow: weeklyIncome - weeklyExpenses,
      monthlyNetCashflow: monthlyIncome - monthlyExpenses,
    };
  };

  // Generate chart data
  const generateChartData = () => {
    const weeklyData = weeklyDataEntries.map((entry, index) => {
      const totalNames = 
        entry.fieldWork + entry.dataEntry + entry.bacAudit + 
        entry.metadataAudit + entry.virtualAudit;
      
      const income = 
        (entry.fieldWork * INCOME_RATES.fieldWork) +
        (entry.dataEntry * INCOME_RATES.dataEntry) +
        (entry.bacAudit * INCOME_RATES.bacAudit) +
        (entry.metadataAudit * INCOME_RATES.metadataAudit) +
        (entry.virtualAudit * INCOME_RATES.virtualAudit) +
        WEEKLY_BOOKLET_INCOME;

      const expenseBreakdown = calculateExpenses(totalNames, entry.fieldWork);
      const logistics = income * 0.03;
      const incentives = income * 0.02;
      
      const expenses = 
        expenseBreakdown.perNameExpenses +
        expenseBreakdown.productionManager +
        expenseBreakdown.fixedSalaries +
        expenseBreakdown.weeklyExpenses +
        expenseBreakdown.employeeGratuity +
        logistics +
        incentives;

      return {
        week: `Week ${index + 1}`,
        income,
        expenses,
        netCashflow: income - expenses,
      };
    });

    const monthlyCategories = [
      { category: 'Salaries', amount: 400000 },
      { category: 'Operations', amount: 80000 },
      { category: 'Logistics', amount: 60000 },
      { category: 'Incentives', amount: 40000 },
    ];

    const incomeVsExpenses = [
      { name: 'Field Work', value: 45 },
      { name: 'Data Entry', value: 25 },
      { name: 'Audits', value: 20 },
      { name: 'Booklets', value: 10 },
    ];

    return {
      weeklyData,
      monthlyCategories,
      incomeVsExpenses,
    };
  };

  const handleWeeklyDataSubmit = (data: WeeklyData) => {
    setWeeklyDataEntries(prev => [...prev, data]);
    
    // Check for negative cashflow and alert
    const metrics = calculateMetrics();
    if (metrics.weeklyNetCashflow < 0) {
      toast({
        title: "Cashflow Alert",
        description: "This week shows negative cashflow. Review expenses immediately.",
        variant: "destructive",
      });
    }
  };

  const metrics = calculateMetrics();
  const chartData = generateChartData();

  return (
    <DashboardLayout title="Financial Dashboard">
      <div className="space-y-8">
        {/* Metrics Overview */}
        <MetricCards data={metrics} />

        {/* Alert for Negative Cashflow */}
        {metrics.weeklyNetCashflow < 0 && (
          <Card className="border-danger bg-danger-background p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-danger" />
              <div>
                <h3 className="font-semibold text-danger-foreground">Cashflow Alert</h3>
                <p className="text-sm text-danger-foreground">
                  Current week shows negative cashflow of{' '}
                  {new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                  }).format(Math.abs(metrics.weeklyNetCashflow))}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="charts">Analytics</TabsTrigger>
            <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} />
              
              <Card className="financial-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('charts')}
                  >
                    View Analytics Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('expenses')}
                  >
                    View Expense Breakdown
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    Export Weekly Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    Export Monthly Report
                  </Button>
                </div>
              </Card>
            </div>

            {/* Expense Overview */}
            {weeklyDataEntries.length > 0 && (
              <div className="mt-6">
                <ExpenseBreakdown
                  totalNames={
                    weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork +
                    weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry +
                    weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit +
                    weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit +
                    weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0
                  }
                  fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0}
                  weeklyIncome={metrics.weeklyIncome}
                  expenseData={(() => {
                    const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
                    if (!currentWeek) return { perNameExpenses: 0, productionManager: 0, fixedSalaries: 0, weeklyExpenses: 0, employeeGratuity: 0 };
                    const totalNames = currentWeek.fieldWork + currentWeek.dataEntry + currentWeek.bacAudit + currentWeek.metadataAudit + currentWeek.virtualAudit;
                    return calculateExpenses(totalNames, currentWeek.fieldWork);
                  })()}
                  logistics={metrics.weeklyIncome * 0.03}
                  incentives={metrics.weeklyIncome * 0.02}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="data-entry">
            <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} />
          </TabsContent>

          <TabsContent value="expenses">
            {weeklyDataEntries.length > 0 ? (
              <ExpenseBreakdown
                totalNames={
                  weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork +
                  weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry +
                  weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit +
                  weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit +
                  weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0
                }
                fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0}
                weeklyIncome={metrics.weeklyIncome}
                expenseData={(() => {
                  const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
                  if (!currentWeek) return { perNameExpenses: 0, productionManager: 0, fixedSalaries: 0, weeklyExpenses: 0, employeeGratuity: 0 };
                  const totalNames = currentWeek.fieldWork + currentWeek.dataEntry + currentWeek.bacAudit + currentWeek.metadataAudit + currentWeek.virtualAudit;
                  return calculateExpenses(totalNames, currentWeek.fieldWork);
                })()}
                logistics={metrics.weeklyIncome * 0.03}
                incentives={metrics.weeklyIncome * 0.02}
              />
            ) : (
              <Card className="financial-card p-8 text-center">
                <p className="text-muted-foreground">Enter weekly data to see expense breakdown</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="charts">
            <FinancialCharts data={chartData} />
          </TabsContent>

          <TabsContent value="ai-assistant">
            <Card className="financial-card p-8 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI Financial Assistant</h3>
                <p className="text-muted-foreground">
                  Get intelligent insights about your financial data, ask questions about cashflow trends, 
                  and receive recommendations for optimizing your expenses.
                </p>
                <div className="bg-warning-background border border-warning/20 rounded-lg p-4 text-left">
                  <p className="text-sm text-warning-foreground">
                    <strong>Note:</strong> The AI Assistant requires a backend connection. 
                    Connect to Supabase to enable this feature and unlock powerful financial insights.
                  </p>
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-dark"
                  disabled
                >
                  Connect Supabase to Enable AI
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Index;
