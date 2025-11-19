import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCards } from '@/components/MetricCards';
import { WeeklyDataEntry, WeeklyData } from '@/components/WeeklyDataEntry';
import { FinancialCharts } from '@/components/FinancialCharts';
import { ExpenseBreakdown } from '@/components/ExpenseBreakdown';
import { MonthlySummary } from '@/components/MonthlySummary';
import { HistoryView } from '@/components/HistoryView';
import { BudgetCalculator } from '@/components/BudgetCalculator';
import { RateSettings } from '@/components/RateSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FileText, Plus, AlertCircle, LogOut, Receipt, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getISOWeek, getCurrentWeekRange } from '@/utils/weekUtils';
const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role, loading, signOut } = useAuth();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  const [weeklyDataEntries, setWeeklyDataEntries] = useState<WeeklyData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [customExpenses, setCustomExpenses] = useState<{
    fieldWorkExpenses?: number;
    productionManagerFieldWork?: number;
    productionManagerDataEntry?: number;
    productionManagerBacAudit?: number;
    fixedSalaries?: number;
    weeklyExpenses?: number;
    employeeGratuity?: number;
    logistics?: number;
    incentives?: number;
    otherExpenses?: { name: string; amount: number }[];
  } | null>(null);

  // Income rates
  const [currentRateConfig, setCurrentRateConfig] = useState<any>(null);
  
  // Monthly financial data from actual records
  const [monthlyFinancials, setMonthlyFinancials] = useState<{
    income: number;
    expenses: number;
  }>({ income: 0, expenses: 0 });

  // Fetch current rate configuration and current week's record
  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch rate configuration
      const { data: rateData, error: rateError } = await supabase
        .from('rate_configurations')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (!rateError && rateData) {
        setCurrentRateConfig(rateData);
      }

      // Get current week (Sunday to Saturday)
      const { week: currentWeek, year: currentYear } = getCurrentWeekRange();

      // Fetch the current week's record
      const { data: currentWeekRecord, error: recordError } = await supabase
        .from('weekly_records')
        .select('*')
        .eq('year', currentYear)
        .eq('week_number', currentWeek)
        .maybeSingle();

      if (!recordError && currentWeekRecord) {
        // Convert database record to WeeklyData format
        const weekData: WeeklyData = {
          week: new Date().toISOString().split('T')[0],
          fieldWork: currentWeekRecord.field_work || 0,
          dataEntry: currentWeekRecord.data_entry || 0,
          bacAudit: currentWeekRecord.bac_audit || 0,
          metadataAudit: currentWeekRecord.metadata_audit || 0,
          virtualAudit: currentWeekRecord.virtual_audit || 0,
          bookletProduction: currentWeekRecord.booklet_income || 0
        };
        setWeeklyDataEntries([weekData]);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch monthly financial data from actual records
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Calculate approximate week range for current month
      // Week 1-4 = Jan, Week 5-8 = Feb, etc.
      const startWeek = Math.floor((currentMonth - 1) * 4.33) + 1;
      const endWeek = Math.floor(currentMonth * 4.33);
      
      const { data: monthlyRecords, error } = await supabase
        .from('weekly_records')
        .select('total_income, total_expenses')
        .eq('year', currentYear)
        .gte('week_number', startWeek)
        .lte('week_number', endWeek);

      if (monthlyRecords && monthlyRecords.length > 0) {
        const totalIncome = monthlyRecords.reduce((sum, record) => sum + Number(record.total_income || 0), 0);
        const totalExpenses = monthlyRecords.reduce((sum, record) => sum + Number(record.total_expenses || 0), 0);
        setMonthlyFinancials({ income: totalIncome, expenses: totalExpenses });
      }
    };
    
    fetchMonthlyData();
  }, [weeklyDataEntries]); // Recalculate when weekly data changes

  // Income rates from database
  const INCOME_RATES = currentRateConfig ? {
    fieldWork: currentRateConfig.field_work_rate,
    dataEntry: currentRateConfig.data_entry_rate,
    bacAudit: currentRateConfig.bac_audit_rate,
    metadataAudit: currentRateConfig.metadata_audit_rate,
    virtualAudit: currentRateConfig.virtual_audit_rate
  } : {
    fieldWork: 90,
    dataEntry: 15,
    bacAudit: 5,
    metadataAudit: 5,
    virtualAudit: 5
  };

  // Monthly fixed income (prorated weekly)
  const MONTHLY_BOOKLET_INCOME = currentRateConfig?.booklet_monthly_income || 65000;
  const WEEKLY_BOOKLET_INCOME = MONTHLY_BOOKLET_INCOME / 4.33;

  // Calculate expenses using rates from database
  const calculateExpenses = (fieldWorkNames: number, dataEntryNames: number = 0, bacAuditNames: number = 0): {
    fieldWorkExpenses: number;
    productionManagerFieldWork: number;
    productionManagerDataEntry: number;
    productionManagerBacAudit: number;
    fixedSalaries: number;
    weeklyExpenses: number;
    employeeGratuity: number;
  } => {
    if (!currentRateConfig) {
      return {
        fieldWorkExpenses: 0,
        productionManagerFieldWork: 0,
        productionManagerDataEntry: 0,
        productionManagerBacAudit: 0,
        fixedSalaries: 0,
        weeklyExpenses: 0,
        employeeGratuity: 0
      };
    }

    // Field Staff Salaries (per name)
    const fieldStaffSalariesPerName = 
      currentRateConfig.field_agent_rate +
      currentRateConfig.field_manager_rate +
      currentRateConfig.booking_agent_rate +
      currentRateConfig.field_relation_rate +
      currentRateConfig.field_misc_rate;

    const fieldWorkExpenses = fieldWorkNames * fieldStaffSalariesPerName;

    // Data Entry expenses (per name)
    const dataEntryPerName = 
      currentRateConfig.data_entry_clerks_rate +
      currentRateConfig.qa_manager_rate +
      currentRateConfig.data_entry_misc_rate;

    const dataEntryExpenses = dataEntryNames * dataEntryPerName;

    // Production Manager costs per work type
    const productionManagerFieldWork = fieldWorkNames * currentRateConfig.pm_field_work_rate;
    const productionManagerDataEntry = dataEntryNames * currentRateConfig.pm_data_entry_rate;
    const productionManagerBacAudit = bacAuditNames * currentRateConfig.pm_bac_audit_rate;

    // Fixed monthly salaries (prorated weekly)
    const fixedSalaries = (
      currentRateConfig.field_relation_supervisor_salary +
      currentRateConfig.administrative_assistant_salary +
      currentRateConfig.field_relation_officers_salary
    ) / 4.33;

    // Weekly expenses (prorated monthly costs)
    const weeklyExpenses = (
      currentRateConfig.power_plant_monthly +
      currentRateConfig.office_data_subscription_monthly +
      currentRateConfig.staff_data_support_monthly
    ) / 4.33;

    // Total salaries for gratuity calculation
    const totalSalaries = 
      fieldWorkExpenses + 
      dataEntryExpenses +
      productionManagerFieldWork + 
      productionManagerDataEntry + 
      productionManagerBacAudit + 
      fixedSalaries;

    const employeeGratuity = totalSalaries * currentRateConfig.employee_gratuity_rate;

    return {
      fieldWorkExpenses,
      productionManagerFieldWork,
      productionManagerDataEntry,
      productionManagerBacAudit,
      fixedSalaries,
      weeklyExpenses,
      employeeGratuity
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
        monthlyNetCashflow: 0
      };
    }

    // Calculate weekly income
    const weeklyIncome = currentWeek.fieldWork * INCOME_RATES.fieldWork + currentWeek.dataEntry * INCOME_RATES.dataEntry + currentWeek.bacAudit * INCOME_RATES.bacAudit + currentWeek.metadataAudit * INCOME_RATES.metadataAudit + currentWeek.virtualAudit * INCOME_RATES.virtualAudit + (currentWeek.bookletProduction || 0);

    // Calculate total names for expense calculation
    const totalNames = currentWeek.fieldWork + currentWeek.dataEntry + currentWeek.bacAudit + currentWeek.metadataAudit + currentWeek.virtualAudit;
    const expenseBreakdown = calculateExpenses(currentWeek.fieldWork, currentWeek.dataEntry, currentWeek.bacAudit);

    // Calculate logistics and incentives using rates from config
    const logistics = currentRateConfig ? weeklyIncome * currentRateConfig.logistics_rate : weeklyIncome * 0.03;
    const incentives = currentRateConfig ? weeklyIncome * currentRateConfig.incentives_rate : weeklyIncome * 0.02;
    const weeklyExpenses = expenseBreakdown.fieldWorkExpenses + expenseBreakdown.productionManagerFieldWork + expenseBreakdown.productionManagerDataEntry + expenseBreakdown.productionManagerBacAudit + expenseBreakdown.fixedSalaries + expenseBreakdown.weeklyExpenses + expenseBreakdown.employeeGratuity + logistics + incentives;

    // Use actual monthly data from database if available, otherwise estimate
    const monthlyIncome = monthlyFinancials.income > 0 ? monthlyFinancials.income : weeklyIncome * 4.33;
    const monthlyExpenses = monthlyFinancials.expenses > 0 ? monthlyFinancials.expenses : weeklyExpenses * 4.33;
    
    return {
      weeklyIncome,
      weeklyExpenses,
      monthlyIncome,
      monthlyExpenses,
      weeklyNetCashflow: weeklyIncome - weeklyExpenses,
      monthlyNetCashflow: monthlyIncome - monthlyExpenses
    };
  };

  // Generate chart data
  const generateChartData = () => {
    const weeklyData = weeklyDataEntries.map((entry, index) => {
      const totalNames = entry.fieldWork + entry.dataEntry + entry.bacAudit + entry.metadataAudit + entry.virtualAudit;
      const income = entry.fieldWork * INCOME_RATES.fieldWork + entry.dataEntry * INCOME_RATES.dataEntry + entry.bacAudit * INCOME_RATES.bacAudit + entry.metadataAudit * INCOME_RATES.metadataAudit + entry.virtualAudit * INCOME_RATES.virtualAudit + (entry.bookletProduction || 0);
      const expenseBreakdown = calculateExpenses(entry.fieldWork, entry.dataEntry, entry.bacAudit);
      const logistics = currentRateConfig ? income * currentRateConfig.logistics_rate : income * 0.03;
      const incentives = currentRateConfig ? income * currentRateConfig.incentives_rate : income * 0.02;
      const expenses = expenseBreakdown.fieldWorkExpenses + expenseBreakdown.productionManagerFieldWork + expenseBreakdown.productionManagerDataEntry + expenseBreakdown.productionManagerBacAudit + expenseBreakdown.fixedSalaries + expenseBreakdown.weeklyExpenses + expenseBreakdown.employeeGratuity + logistics + incentives;
      return {
        week: `Week ${index + 1}`,
        income,
        expenses,
        netCashflow: income - expenses
      };
    });
    const monthlyCategories = [{
      category: 'Salaries',
      amount: 400000
    }, {
      category: 'Operations',
      amount: 80000
    }, {
      category: 'Logistics',
      amount: 60000
    }, {
      category: 'Incentives',
      amount: 40000
    }];
    const incomeVsExpenses = [{
      name: 'Field Work',
      value: 45
    }, {
      name: 'Data Entry',
      value: 25
    }, {
      name: 'Audits',
      value: 20
    }, {
      name: 'Booklets',
      value: 10
    }];
    return {
      weeklyData,
      monthlyCategories,
      incomeVsExpenses
    };
  };
  const handleWeeklyDataSubmit = async (data: WeeklyData) => {
    setWeeklyDataEntries(prev => [...prev, data]);

    // Calculate metrics for this week
    const weeklyIncome = data.fieldWork * INCOME_RATES.fieldWork + 
                        data.dataEntry * INCOME_RATES.dataEntry + 
                        data.bacAudit * INCOME_RATES.bacAudit + 
                        data.metadataAudit * INCOME_RATES.metadataAudit + 
                        data.virtualAudit * INCOME_RATES.virtualAudit + 
                        (data.bookletProduction || 0);

    const expenseBreakdown = calculateExpenses(data.fieldWork, data.dataEntry, data.bacAudit);
    const logistics = currentRateConfig ? weeklyIncome * currentRateConfig.logistics_rate : weeklyIncome * 0.03;
    const incentives = currentRateConfig ? weeklyIncome * currentRateConfig.incentives_rate : weeklyIncome * 0.02;
    
    // Calculate other expenses total
    const otherExpensesTotal = customExpenses?.otherExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    
    const weeklyExpenses = expenseBreakdown.fieldWorkExpenses + 
                          expenseBreakdown.productionManagerFieldWork + 
                          expenseBreakdown.productionManagerDataEntry + 
                          expenseBreakdown.productionManagerBacAudit + 
                          expenseBreakdown.fixedSalaries + 
                          expenseBreakdown.weeklyExpenses + 
                          expenseBreakdown.employeeGratuity + 
                          logistics + 
                          incentives +
                          otherExpensesTotal;

    // Save to database
    try {
      const weekDate = new Date(data.week);
      const { week: weekNumber, year } = getISOWeek(weekDate);

      const { error } = await supabase.from('weekly_records').insert({
        week_number: weekNumber,
        year: year,
        field_work: data.fieldWork,
        data_entry: data.dataEntry,
        bac_audit: data.bacAudit,
        metadata_audit: data.metadataAudit,
        virtual_audit: data.virtualAudit,
        booklet_income: data.bookletProduction || 0,
        total_income: weeklyIncome,
        total_expenses: weeklyExpenses,
        net_cashflow: weeklyIncome - weeklyExpenses,
        other_expenses: customExpenses?.otherExpenses || [],
        rate_config_id: currentRateConfig?.id
      });

      if (error) throw error;

      // Auto-create daily income entry for weekly data
      await supabase.from('daily_transactions').insert({
        date: data.week,
        type: 'income',
        category: 'Weekly Revenue',
        description: `Weekly Income - Week ${weekNumber}, ${year}`,
        amount: weeklyIncome,
        reference_id: null,
        reference_type: 'weekly_record',
        is_auto_generated: true,
        metadata: {
          field_work: data.fieldWork,
          data_entry: data.dataEntry,
          bac_audit: data.bacAudit,
          metadata_audit: data.metadataAudit,
          virtual_audit: data.virtualAudit,
          booklet_income: data.bookletProduction,
          week_number: weekNumber,
          year: year
        }
      });

      toast({
        title: "Success",
        description: `Week ${weekNumber}, ${year} data saved successfully`
      });
    } catch (error: any) {
      console.error('Error saving weekly data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save data to history",
        variant: "destructive"
      });
    }

    // Reset custom expenses when new data is entered
    setCustomExpenses(null);

    // Check for negative cashflow and alert
    const metrics = calculateMetrics();
    if (metrics.weeklyNetCashflow < 0) {
      toast({
        title: "Cashflow Alert",
        description: "This week shows negative cashflow. Review expenses immediately.",
        variant: "destructive"
      });
    }
  };
  const handleExpenseChange = (updatedExpenses: {
    fieldWorkExpenses: number;
    productionManagerFieldWork: number;
    productionManagerDataEntry: number;
    productionManagerBacAudit: number;
    fixedSalaries: number;
    weeklyExpenses: number;
    employeeGratuity: number;
    logistics: number;
    incentives: number;
    otherExpenses: { name: string; amount: number }[];
  }) => {
    setCustomExpenses(updatedExpenses);
  };

  // Function to get current expense data (custom or calculated)
  const getCurrentExpenseData = () => {
    const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
    if (!currentWeek) {
      return {
        fieldWorkExpenses: 0,
        productionManagerFieldWork: 0,
        productionManagerDataEntry: 0,
        productionManagerBacAudit: 0,
        fixedSalaries: 0,
        weeklyExpenses: 0,
        employeeGratuity: 0
      };
    }
    const calculatedExpenses = calculateExpenses(currentWeek.fieldWork, currentWeek.dataEntry, currentWeek.bacAudit);
    if (customExpenses) {
      return {
        fieldWorkExpenses: customExpenses.fieldWorkExpenses ?? calculatedExpenses.fieldWorkExpenses,
        productionManagerFieldWork: customExpenses.productionManagerFieldWork ?? calculatedExpenses.productionManagerFieldWork,
        productionManagerDataEntry: customExpenses.productionManagerDataEntry ?? calculatedExpenses.productionManagerDataEntry,
        productionManagerBacAudit: customExpenses.productionManagerBacAudit ?? calculatedExpenses.productionManagerBacAudit,
        fixedSalaries: customExpenses.fixedSalaries ?? calculatedExpenses.fixedSalaries,
        weeklyExpenses: customExpenses.weeklyExpenses ?? calculatedExpenses.weeklyExpenses,
        employeeGratuity: customExpenses.employeeGratuity ?? calculatedExpenses.employeeGratuity
      };
    }
    return calculatedExpenses;
  };

  // Function to get current logistics and incentives
  const getCurrentLogisticsAndIncentives = () => {
    if (customExpenses) {
      return {
        logistics: customExpenses.logistics ?? metrics.weeklyIncome * 0.03,
        incentives: customExpenses.incentives ?? metrics.weeklyIncome * 0.02
      };
    }
    return {
      logistics: metrics.weeklyIncome * 0.03,
      incentives: metrics.weeklyIncome * 0.02
    };
  };
  const metrics = calculateMetrics();
  const chartData = generateChartData();
  const currentExpenseData = getCurrentExpenseData();
  const {
    logistics,
    incentives
  } = getCurrentLogisticsAndIncentives();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return <DashboardLayout title="Financial Dashboard">
      <div className="space-y-8">
        {/* User Info & Logout */}
        <Card className="financial-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="font-semibold text-card-foreground">{user?.email}</p>
              <p className="text-xs text-primary capitalize">Role: {role}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>

        {/* Metrics Overview */}
        <MetricCards data={metrics} />

        {/* Alert for Negative Cashflow */}
        {metrics.weeklyNetCashflow < 0 && <Card className="border-danger bg-danger-background p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-danger" />
              <div>
                <h3 className="font-semibold text-danger-foreground">Cashflow Alert</h3>
                <p className="text-sm text-danger-foreground">
                  Current week shows negative cashflow of{' '}
                  {new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN'
              }).format(Math.abs(metrics.weeklyNetCashflow))}
                </p>
              </div>
            </div>
          </Card>}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data-entry">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="rates" disabled={role === 'guest'}>
              Rates {role === 'guest' && '🔒'}
            </TabsTrigger>
            <TabsTrigger value="charts">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="ai-assistant" disabled={role === 'guest'}>
              AI Assistant {role === 'guest' && '🔒'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} rateConfig={currentRateConfig} />
              
              <Card className="financial-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-card-foreground">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/generate-invoice')}>
                    <Receipt className="h-4 w-4" />
                    Generate Invoice
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/bulk-invoice')}>
                    <Users className="h-4 w-4" />
                    Bulk Invoice Generation
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/company-settings')}>
                    <Settings className="h-4 w-4" />
                    Company Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/daily-tracker')}>
                    <Receipt className="h-4 w-4" />
                    Daily Income & Expense Tracker
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('charts')}>
                    View Analytics Dashboard
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('expenses')}>
                    View Expense Breakdown
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Export Weekly Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Export Monthly Report
                  </Button>
                </div>
              </Card>
            </div>

            {/* Expense Overview */}
            {weeklyDataEntries.length > 0 && <div className="mt-6">
                <ExpenseBreakdown totalNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork + weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry + weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0} fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0} weeklyIncome={metrics.weeklyIncome} expenseData={currentExpenseData} logistics={logistics} incentives={incentives} otherExpenses={customExpenses?.otherExpenses || []} rateConfig={currentRateConfig} onExpenseChange={handleExpenseChange} />
              </div>}
          </TabsContent>

          <TabsContent value="data-entry">
            <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} rateConfig={currentRateConfig} />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            {weeklyDataEntries.length > 0 ? (
              <>
              <ExpenseBreakdown 
                  totalNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork + 
                             weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry + 
                             weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit + 
                             weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit + 
                             weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0} 
                  fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0} 
                  weeklyIncome={metrics.weeklyIncome} 
                  expenseData={currentExpenseData} 
                  logistics={logistics} 
                  incentives={incentives} 
                  otherExpenses={customExpenses?.otherExpenses || []}
                  rateConfig={currentRateConfig}
                  onExpenseChange={handleExpenseChange} 
                />
                <MonthlySummary />
              </>
            ) : (
              <Card className="financial-card p-8 text-center">
                <p className="text-muted-foreground">Enter weekly data to see expense breakdown</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="budget">
            <BudgetCalculator />
          </TabsContent>

          <TabsContent value="rates" className="space-y-6">
            {role === 'admin' ? (
              <RateSettings />
            ) : (
              <Card className="financial-card p-8 text-center">
                <p className="text-muted-foreground">Access restricted to administrators</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="charts">
            <FinancialCharts data={chartData} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryView />
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-6">
            {role === 'admin' ? (
              <Card className="financial-card p-8 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">AI Financial Assistant</h3>
                  <p className="text-muted-foreground">
                    AI assistant feature coming soon. This will help analyze financial data and provide insights.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="financial-card p-8 text-center">
                <p className="text-muted-foreground">Access restricted to administrators</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>;
};
export default Index;