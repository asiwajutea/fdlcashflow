import React, { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, FileText, Plus, AlertCircle, LogOut, Receipt, Users, Settings, ShieldCheck, Briefcase, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Eye, ClipboardCheck, PenTool } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getISOWeek, getCurrentWeekRange } from '@/utils/weekUtils';

// Candidate Dashboard Component
const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, fullName, signOut } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch candidate's applications
      const { data: candidate } = await (supabase as any)
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (candidate) {
        const { data: apps } = await (supabase as any)
          .from('applications')
          .select(`
            id, status, applied_at, cover_letter,
            job_positions!inner(id, title, department, job_type)
          `)
          .eq('candidate_id', candidate.id)
          .order('applied_at', { ascending: false });
        setApplications(apps || []);
      }

      // Fetch company social links
      const { data: settings } = await (supabase as any)
        .from('company_settings')
        .select('social_facebook, social_twitter, social_instagram, social_linkedin, social_youtube, social_tiktok, social_website')
        .maybeSingle();
      setSocialLinks(settings);

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const getStatusAction = (status: string) => {
    switch (status) {
      case 'screening': return { label: 'Complete Screening', icon: ClipboardCheck, path: '/screening' };
      case 'interview': return { label: 'View Interview', icon: Eye, path: '/interviews' };
      case 'offered': return { label: 'Sign Contract', icon: PenTool, path: '/offers' };
      default: return null;
    }
  };

  const statusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'hired': return 'default';
      case 'rejected': return 'destructive';
      case 'interview': case 'offered': return 'secondary';
      default: return 'outline';
    }
  };

  const socialIcons = [
    { key: 'social_facebook', icon: Facebook, label: 'Facebook' },
    { key: 'social_twitter', icon: Twitter, label: 'Twitter' },
    { key: 'social_instagram', icon: Instagram, label: 'Instagram' },
    { key: 'social_linkedin', icon: Linkedin, label: 'LinkedIn' },
    { key: 'social_youtube', icon: Youtube, label: 'YouTube' },
    { key: 'social_website', icon: Globe, label: 'Website' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome back, {fullName || 'Candidate'}! 👋</h2>
              <p className="text-muted-foreground mt-1">Track your applications and explore new opportunities.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/auth'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Applications */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                My Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No applications yet</p>
                  <Button className="mt-3" onClick={() => navigate('/jobs')}>Browse Jobs</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app: any) => {
                    const action = getStatusAction(app.status);
                    return (
                      <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{app.job_positions?.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{app.job_positions?.department}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{new Date(app.applied_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusColor(app.status)} className="capitalize">{app.status}</Badge>
                          {action && (
                            <Button size="sm" variant="outline" onClick={() => navigate(action.path)} className="gap-1">
                              <action.icon className="h-3.5 w-3.5" />
                              {action.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/jobs')}>
                <Briefcase className="h-4 w-4" /> Browse Job Openings
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/inbox')}>
                <Mail className="h-4 w-4" /> Messages
              </Button>
            </CardContent>
          </Card>

          {/* Company Social Media */}
          {socialLinks && Object.values(socialLinks).some(Boolean) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Follow Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {socialIcons.map(({ key, icon: Icon, label }) => {
                    const url = socialLinks[key];
                    if (!url) return null;
                    return (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-muted hover:bg-accent transition-colors text-sm">
                        <Icon className="h-4 w-4" /> {label}
                      </a>
                    );
                  })}
                  {socialLinks.social_tiktok && (
                    <a href={socialLinks.social_tiktok} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-muted hover:bg-accent transition-colors text-sm">
                      TikTok
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role, loading, signOut, hasCapability } = useAuth();

  const canAccess = useCallback((capability: string) => {
    return role === 'admin' || hasCapability(capability);
  }, [role, hasCapability]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // --- All hooks must be called before any conditional return ---
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

  const [currentRateConfig, setCurrentRateConfig] = useState<any>(null);
  const [monthlyFinancials, setMonthlyFinancials] = useState<{ income: number; expenses: number }>({ income: 0, expenses: 0 });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: rateData, error: rateError } = await (supabase as any)
        .from('rate_configurations')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      if (!rateError && rateData) setCurrentRateConfig(rateData);

      const { week: currentWeek, year: currentYear } = getCurrentWeekRange();
      const { data: currentWeekRecord, error: recordError } = await (supabase as any)
        .from('weekly_records')
        .select('*')
        .eq('year', currentYear)
        .eq('week_number', currentWeek)
        .maybeSingle();

      if (!recordError && currentWeekRecord) {
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

  useEffect(() => {
    const fetchMonthlyData = async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const startWeek = Math.floor((currentMonth - 1) * 4.33) + 1;
      const endWeek = Math.floor(currentMonth * 4.33);
      
      const { data: monthlyRecords } = await (supabase as any)
        .from('weekly_records')
        .select('total_income, total_expenses')
        .eq('year', currentYear)
        .gte('week_number', startWeek)
        .lte('week_number', endWeek);

      if (monthlyRecords && monthlyRecords.length > 0) {
        const totalIncome = monthlyRecords.reduce((sum: number, record: any) => sum + Number(record.total_income || 0), 0);
        const totalExpenses = monthlyRecords.reduce((sum: number, record: any) => sum + Number(record.total_expenses || 0), 0);
        setMonthlyFinancials({ income: totalIncome, expenses: totalExpenses });
      }
    };
    fetchMonthlyData();
  }, [weeklyDataEntries]);

  const INCOME_RATES = currentRateConfig ? {
    fieldWork: currentRateConfig.field_work_rate,
    dataEntry: currentRateConfig.data_entry_rate,
    bacAudit: currentRateConfig.bac_audit_rate,
    metadataAudit: currentRateConfig.metadata_audit_rate,
    virtualAudit: currentRateConfig.virtual_audit_rate
  } : { fieldWork: 90, dataEntry: 15, bacAudit: 5, metadataAudit: 5, virtualAudit: 5 };

  const MONTHLY_BOOKLET_INCOME = currentRateConfig?.booklet_monthly_income || 65000;
  const WEEKLY_BOOKLET_INCOME = MONTHLY_BOOKLET_INCOME / 4.33;

  const calculateExpenses = (fieldWorkNames: number, dataEntryNames: number = 0, bacAuditNames: number = 0) => {
    if (!currentRateConfig) {
      return { fieldWorkExpenses: 0, productionManagerFieldWork: 0, productionManagerDataEntry: 0, productionManagerBacAudit: 0, fixedSalaries: 0, weeklyExpenses: 0, employeeGratuity: 0 };
    }
    const fieldStaffSalariesPerName = currentRateConfig.field_agent_rate + currentRateConfig.field_manager_rate + currentRateConfig.booking_agent_rate + currentRateConfig.field_relation_rate + currentRateConfig.field_misc_rate;
    const fieldWorkExpenses = fieldWorkNames * fieldStaffSalariesPerName;
    const dataEntryPerName = currentRateConfig.data_entry_clerks_rate + currentRateConfig.qa_manager_rate + currentRateConfig.data_entry_misc_rate;
    const dataEntryExpenses = dataEntryNames * dataEntryPerName;
    const productionManagerFieldWork = fieldWorkNames * currentRateConfig.pm_field_work_rate;
    const productionManagerDataEntry = dataEntryNames * currentRateConfig.pm_data_entry_rate;
    const productionManagerBacAudit = bacAuditNames * currentRateConfig.pm_bac_audit_rate;
    const fixedSalaries = (currentRateConfig.field_relation_supervisor_salary + currentRateConfig.administrative_assistant_salary + currentRateConfig.field_relation_officers_salary) / 4.33;
    const weeklyExpenses = (currentRateConfig.power_plant_monthly + currentRateConfig.office_data_subscription_monthly + currentRateConfig.staff_data_support_monthly) / 4.33;
    const totalSalaries = fieldWorkExpenses + dataEntryExpenses + productionManagerFieldWork + productionManagerDataEntry + productionManagerBacAudit + fixedSalaries;
    const employeeGratuity = totalSalaries * currentRateConfig.employee_gratuity_rate;
    return { fieldWorkExpenses, productionManagerFieldWork, productionManagerDataEntry, productionManagerBacAudit, fixedSalaries, weeklyExpenses, employeeGratuity };
  };

  const calculateMetrics = () => {
    const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
    if (!currentWeek) return { weeklyIncome: 0, weeklyExpenses: 0, monthlyIncome: 0, monthlyExpenses: 0, weeklyNetCashflow: 0, monthlyNetCashflow: 0 };
    const weeklyIncome = currentWeek.fieldWork * INCOME_RATES.fieldWork + currentWeek.dataEntry * INCOME_RATES.dataEntry + currentWeek.bacAudit * INCOME_RATES.bacAudit + currentWeek.metadataAudit * INCOME_RATES.metadataAudit + currentWeek.virtualAudit * INCOME_RATES.virtualAudit + (currentWeek.bookletProduction || 0);
    const expenseBreakdown = calculateExpenses(currentWeek.fieldWork, currentWeek.dataEntry, currentWeek.bacAudit);
    const logistics = currentRateConfig ? weeklyIncome * currentRateConfig.logistics_rate : weeklyIncome * 0.03;
    const incentives = currentRateConfig ? weeklyIncome * currentRateConfig.incentives_rate : weeklyIncome * 0.02;
    const weeklyExp = expenseBreakdown.fieldWorkExpenses + expenseBreakdown.productionManagerFieldWork + expenseBreakdown.productionManagerDataEntry + expenseBreakdown.productionManagerBacAudit + expenseBreakdown.fixedSalaries + expenseBreakdown.weeklyExpenses + expenseBreakdown.employeeGratuity + logistics + incentives;
    const monthlyIncome = monthlyFinancials.income > 0 ? monthlyFinancials.income : weeklyIncome * 4.33;
    const monthlyExpenses = monthlyFinancials.expenses > 0 ? monthlyFinancials.expenses : weeklyExp * 4.33;
    return { weeklyIncome, weeklyExpenses: weeklyExp, monthlyIncome, monthlyExpenses, weeklyNetCashflow: weeklyIncome - weeklyExp, monthlyNetCashflow: monthlyIncome - monthlyExpenses };
  };

  const generateChartData = () => {
    const weeklyData = weeklyDataEntries.map((entry, index) => {
      const income = entry.fieldWork * INCOME_RATES.fieldWork + entry.dataEntry * INCOME_RATES.dataEntry + entry.bacAudit * INCOME_RATES.bacAudit + entry.metadataAudit * INCOME_RATES.metadataAudit + entry.virtualAudit * INCOME_RATES.virtualAudit + (entry.bookletProduction || 0);
      const expenseBreakdown = calculateExpenses(entry.fieldWork, entry.dataEntry, entry.bacAudit);
      const logistics = currentRateConfig ? income * currentRateConfig.logistics_rate : income * 0.03;
      const incentives = currentRateConfig ? income * currentRateConfig.incentives_rate : income * 0.02;
      const expenses = expenseBreakdown.fieldWorkExpenses + expenseBreakdown.productionManagerFieldWork + expenseBreakdown.productionManagerDataEntry + expenseBreakdown.productionManagerBacAudit + expenseBreakdown.fixedSalaries + expenseBreakdown.weeklyExpenses + expenseBreakdown.employeeGratuity + logistics + incentives;
      return { week: `Week ${index + 1}`, income, expenses, netCashflow: income - expenses };
    });
    const monthlyCategories = [{ category: 'Salaries', amount: 400000 }, { category: 'Operations', amount: 80000 }, { category: 'Logistics', amount: 60000 }, { category: 'Incentives', amount: 40000 }];
    const incomeVsExpenses = [{ name: 'Field Work', value: 45 }, { name: 'Data Entry', value: 25 }, { name: 'Audits', value: 20 }, { name: 'Booklets', value: 10 }];
    return { weeklyData, monthlyCategories, incomeVsExpenses };
  };

  const handleWeeklyDataSubmit = async (data: WeeklyData) => {
    setWeeklyDataEntries(prev => [...prev, data]);
    const weeklyIncome = data.fieldWork * INCOME_RATES.fieldWork + data.dataEntry * INCOME_RATES.dataEntry + data.bacAudit * INCOME_RATES.bacAudit + data.metadataAudit * INCOME_RATES.metadataAudit + data.virtualAudit * INCOME_RATES.virtualAudit + (data.bookletProduction || 0);
    const expenseBreakdown = calculateExpenses(data.fieldWork, data.dataEntry, data.bacAudit);
    const logistics = currentRateConfig ? weeklyIncome * currentRateConfig.logistics_rate : weeklyIncome * 0.03;
    const incentives = currentRateConfig ? weeklyIncome * currentRateConfig.incentives_rate : weeklyIncome * 0.02;
    const otherExpensesTotal = customExpenses?.otherExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const weeklyExpenses = expenseBreakdown.fieldWorkExpenses + expenseBreakdown.productionManagerFieldWork + expenseBreakdown.productionManagerDataEntry + expenseBreakdown.productionManagerBacAudit + expenseBreakdown.fixedSalaries + expenseBreakdown.weeklyExpenses + expenseBreakdown.employeeGratuity + logistics + incentives + otherExpensesTotal;

    try {
      const weekDate = new Date(data.week);
      const { week: weekNumber, year } = getISOWeek(weekDate);
      const { error } = await (supabase as any).from('weekly_records').insert({
        week_number: weekNumber, year, field_work: data.fieldWork, data_entry: data.dataEntry,
        bac_audit: data.bacAudit, metadata_audit: data.metadataAudit, virtual_audit: data.virtualAudit,
        booklet_income: data.bookletProduction || 0, total_income: weeklyIncome, total_expenses: weeklyExpenses,
        net_cashflow: weeklyIncome - weeklyExpenses, other_expenses: customExpenses?.otherExpenses || [],
        rate_config_id: currentRateConfig?.id, created_by: user?.id
      });
      if (error) throw error;

      await (supabase as any).from('daily_transactions').insert({
        date: data.week, type: 'income', category: 'Weekly Revenue',
        description: `Weekly Income - Week ${weekNumber}, ${year}`, amount: weeklyIncome,
        reference_type: 'weekly_record', is_auto_generated: true, created_by: user?.id,
        metadata: { field_work: data.fieldWork, data_entry: data.dataEntry, bac_audit: data.bacAudit, metadata_audit: data.metadataAudit, virtual_audit: data.virtualAudit, booklet_income: data.bookletProduction, week_number: weekNumber, year }
      });

      toast({ title: "Success", description: `Week ${weekNumber}, ${year} data saved successfully` });
    } catch (error: any) {
      console.error('Error saving weekly data:', error);
      toast({ title: "Error", description: error.message || "Failed to save data to history", variant: "destructive" });
    }
    setCustomExpenses(null);
    const metrics = calculateMetrics();
    if (metrics.weeklyNetCashflow < 0) {
      toast({ title: "Cashflow Alert", description: "This week shows negative cashflow. Review expenses immediately.", variant: "destructive" });
    }
  };

  const handleExpenseChange = (updatedExpenses: any) => { setCustomExpenses(updatedExpenses); };

  const getCurrentExpenseData = () => {
    const currentWeek = weeklyDataEntries[weeklyDataEntries.length - 1];
    if (!currentWeek) return { fieldWorkExpenses: 0, productionManagerFieldWork: 0, productionManagerDataEntry: 0, productionManagerBacAudit: 0, fixedSalaries: 0, weeklyExpenses: 0, employeeGratuity: 0 };
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

  const getCurrentLogisticsAndIncentives = () => {
    if (customExpenses) {
      return {
        logistics: customExpenses.logistics ?? metrics.weeklyIncome * 0.03,
        incentives: customExpenses.incentives ?? metrics.weeklyIncome * 0.02
      };
    }
    return { logistics: metrics.weeklyIncome * 0.03, incentives: metrics.weeklyIncome * 0.02 };
  };

  const metrics = calculateMetrics();
  const chartData = generateChartData();
  const currentExpenseData = getCurrentExpenseData();
  const { logistics, incentives } = getCurrentLogisticsAndIncentives();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  // Candidate role: show candidate dashboard
  if (role === 'candidate') {
    return (
      <DashboardLayout title="Candidate Dashboard">
        <CandidateDashboard />
      </DashboardLayout>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return <DashboardLayout title="Financial Dashboard">
      <div className="space-y-8">
        <Card className="financial-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="font-semibold text-card-foreground">{user?.email}</p>
              <p className="text-xs text-primary capitalize">Role: {role}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </Card>

        <MetricCards data={metrics} />

        {metrics.weeklyNetCashflow < 0 && <Card className="border-danger bg-danger-background p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-danger" />
              <div>
                <h3 className="font-semibold text-danger-foreground">Cashflow Alert</h3>
                <p className="text-sm text-danger-foreground">
                  Current week shows negative cashflow of{' '}
                  {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Math.abs(metrics.weeklyNetCashflow))}
                </p>
              </div>
            </div>
          </Card>}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data-entry" disabled={!canAccess('enter_weekly_data')}>Income {!canAccess('enter_weekly_data') && '🔒'}</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="rates" disabled={!canAccess('manage_rates')}>Rates {!canAccess('manage_rates') && '🔒'}</TabsTrigger>
            <TabsTrigger value="charts" disabled={!canAccess('view_statistics')}>Analytics {!canAccess('view_statistics') && '🔒'}</TabsTrigger>
            <TabsTrigger value="history" disabled={!canAccess('view_weekly_history')}>History {!canAccess('view_weekly_history') && '🔒'}</TabsTrigger>
            <TabsTrigger value="ai-assistant" disabled={role !== 'admin'}>AI Assistant {role !== 'admin' && '🔒'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {canAccess('enter_weekly_data') && (
                <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} rateConfig={currentRateConfig} />
              )}
              <Card className="financial-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-card-foreground">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  {canAccess('generate_invoice') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/generate-invoice')}>
                      <Receipt className="h-4 w-4" /> Generate Invoice
                    </Button>
                  )}
                  {canAccess('bulk_invoice') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/bulk-invoice')}>
                      <Users className="h-4 w-4" /> Bulk Invoice Generation
                    </Button>
                  )}
                  {canAccess('manage_company_settings') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/company-settings')}>
                      <Settings className="h-4 w-4" /> Company Settings
                    </Button>
                  )}
                  {canAccess('view_daily_tracker') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/daily-tracker')}>
                      <Receipt className="h-4 w-4" /> Daily Income & Expense Tracker
                    </Button>
                  )}
                  {role === 'admin' && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/user-management')}>
                      <ShieldCheck className="h-4 w-4" /> User Management
                    </Button>
                  )}
                  {canAccess('manage_recruitment') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/applications')}>
                      <Briefcase className="h-4 w-4" /> HR Recruitment
                    </Button>
                  )}
                  {canAccess('manage_website_content') && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/cms')}>
                      <Globe className="h-4 w-4" /> Website CMS
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/jobs')}>
                    <Briefcase className="h-4 w-4" /> Job Openings
                  </Button>
                  {canAccess('view_statistics') && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('charts')}>View Analytics Dashboard</Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('expenses')}>View Expense Breakdown</Button>
                  <Button variant="outline" className="w-full justify-start">Export Weekly Report</Button>
                  <Button variant="outline" className="w-full justify-start">Export Monthly Report</Button>
                </div>
              </Card>
            </div>
            {weeklyDataEntries.length > 0 && <div className="mt-6">
                <ExpenseBreakdown totalNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork + weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry + weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0} fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0} weeklyIncome={metrics.weeklyIncome} expenseData={currentExpenseData} logistics={logistics} incentives={incentives} otherExpenses={customExpenses?.otherExpenses || []} rateConfig={currentRateConfig} onExpenseChange={handleExpenseChange} />
              </div>}
          </TabsContent>

          <TabsContent value="data-entry">
            {canAccess('enter_weekly_data') ? (
              <WeeklyDataEntry onDataSubmit={handleWeeklyDataSubmit} rateConfig={currentRateConfig} />
            ) : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">You don't have permission to enter weekly data</p></Card>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            {weeklyDataEntries.length > 0 ? (
              <>
                <ExpenseBreakdown totalNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork + weeklyDataEntries[weeklyDataEntries.length - 1]?.dataEntry + weeklyDataEntries[weeklyDataEntries.length - 1]?.bacAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.metadataAudit + weeklyDataEntries[weeklyDataEntries.length - 1]?.virtualAudit || 0} fieldWorkNames={weeklyDataEntries[weeklyDataEntries.length - 1]?.fieldWork || 0} weeklyIncome={metrics.weeklyIncome} expenseData={currentExpenseData} logistics={logistics} incentives={incentives} otherExpenses={customExpenses?.otherExpenses || []} rateConfig={currentRateConfig} onExpenseChange={handleExpenseChange} />
                <MonthlySummary />
              </>
            ) : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">Enter weekly data to see expense breakdown</p></Card>
            )}
          </TabsContent>

          <TabsContent value="budget"><BudgetCalculator /></TabsContent>

          <TabsContent value="rates" className="space-y-6">
            {canAccess('manage_rates') ? <RateSettings /> : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">You don't have permission to manage rates</p></Card>
            )}
          </TabsContent>

          <TabsContent value="charts"><FinancialCharts data={chartData} /></TabsContent>

          <TabsContent value="history">
            {canAccess('view_weekly_history') ? <HistoryView /> : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">You don't have permission to view history</p></Card>
            )}
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-6">
            {role === 'admin' ? (
              <Card className="financial-card p-8 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="bg-primary/10 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">AI Financial Assistant</h3>
                  <p className="text-muted-foreground">AI assistant feature coming soon.</p>
                </div>
              </Card>
            ) : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">Access restricted to administrators</p></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>;
};
export default Index;
