import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EmployeeDashboard from './EmployeeDashboard';
import { AccessCodeModal } from '@/components/AccessCodeModal';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCards } from '@/components/MetricCards';
import { WeeklyDataEntry, WeeklyData } from '@/components/WeeklyDataEntry';
import { FinancialCharts } from '@/components/FinancialCharts';
import { ExpenseBreakdown } from '@/components/ExpenseBreakdown';
import { MonthlySummary } from '@/components/MonthlySummary';
import { HistoryView } from '@/components/HistoryView';
import { BudgetCalculator } from '@/components/BudgetCalculator';
import { RateSettings } from '@/components/RateSettings';
import AIAssistantPanel from '@/components/AIAssistantPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { MessageSquare, FileText, Plus, AlertCircle, LogOut, Receipt, Users, Settings, ShieldCheck, Briefcase, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Eye, ClipboardCheck, PenTool, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getISOWeek, getCurrentWeekRange, getDateOfISOWeek } from '@/utils/weekUtils';

// Candidate Dashboard Component
const PIPELINE_STAGES = [
  { key: 'submitted',  label: 'Applied',    icon: '📝', desc: 'Application received' },
  { key: 'screening',  label: 'Screening',  icon: '🔍', desc: 'Complete questionnaire' },
  { key: 'interview',  label: 'Interview',  icon: '🎙️', desc: 'Interview scheduled' },
  { key: 'offered',    label: 'Offer',      icon: '📄', desc: 'Review & sign contract' },
  { key: 'hired',      label: 'Hired',      icon: '🎉', desc: 'Welcome to the team!' },
];

const STAGE_INDEX: Record<string, number> = {
  submitted: 0, screening: 1, interview: 2, offered: 3, hired: 4, rejected: -1,
};

function ApplicationPipeline({ app, onAction }: { app: any; onAction: (path: string) => void }) {
  const status = app.status;
  const stageIdx = STAGE_INDEX[status] ?? 0;
  const isRejected = status === 'rejected';

  const actionMap: Record<string, { label: string; path: string; urgent?: boolean }> = {
    screening: { label: 'Complete Screening', path: `/screening?applicationId=${app.id}`, urgent: true },
    interview: { label: 'View Interview Details', path: '/interviews' },
    offered:   { label: 'Review & Sign Contract', path: '/offers', urgent: true },
  };

  // If screening exists but unanswered, always show the action
  const screeningPending = app.screening && !(app.screening?.responses?.answers && Object.keys(app.screening.responses.answers).length > 0);
  const action = screeningPending
    ? { label: 'Complete Screening', path: `/screening?applicationId=${app.id}`, urgent: true }
    : actionMap[status];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      {/* Job header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b">
        <div>
          <h3 className="font-semibold text-foreground leading-tight">{app.job_positions?.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{app.job_positions?.department} · Applied {new Date(app.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        {isRejected ? (
          <Badge variant="destructive" className="shrink-0">Not Selected</Badge>
        ) : status === 'hired' ? (
          <Badge className="shrink-0 bg-emerald-500 text-white">Hired 🎉</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 capitalize text-xs">{status}</Badge>
        )}
      </div>

      {/* Pipeline stepper */}
      {!isRejected && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const done    = i < stageIdx;
              const current = i === stageIdx;
              const future  = i > stageIdx;
              return (
                <React.Fragment key={stage.key}>
                  {/* Step */}
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                      ${done    ? 'bg-emerald-500 border-emerald-500 text-white'
                               : current ? 'bg-primary border-primary text-primary-foreground shadow-md scale-110'
                               : 'bg-muted border-border text-muted-foreground'}`}>
                      {done ? '✓' : <span className="text-[11px]">{stage.icon}</span>}
                    </div>
                    <p className={`text-[10px] text-center leading-tight font-medium truncate w-full
                      ${current ? 'text-primary' : done ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </p>
                  </div>
                  {/* Connector */}
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-shrink-0 w-4 sm:w-6 mx-0.5 rounded-full transition-all
                      ${i < stageIdx ? 'bg-emerald-500' : 'bg-border'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current stage description */}
          {!isRejected && status !== 'hired' && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              <span className="font-medium text-foreground">Current stage:</span>{' '}
              {PIPELINE_STAGES[stageIdx]?.desc}
            </p>
          )}
        </div>
      )}

      {/* Rejected message */}
      {isRejected && (
        <div className="px-5 py-4 text-center text-sm text-muted-foreground">
          Thank you for your application. We've moved forward with other candidates at this time.
        </div>
      )}

      {/* Action CTA */}
      {action && !isRejected && (
        <div className={`px-5 pb-4 ${action.urgent ? '' : ''}`}>
          <button
            onClick={() => onAction(action.path)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
              ${action.urgent
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'border border-primary text-primary hover:bg-primary/5'}`}>
            {action.urgent && <span className="animate-pulse h-2 w-2 rounded-full bg-primary-foreground/80" />}
            {action.label} →
          </button>
        </div>
      )}
    </div>
  );
}
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
        
        // For each application, check if screening exists
        const appsWithScreening = await Promise.all((apps || []).map(async (app: any) => {
          const { data: sr } = await (supabase as any)
            .from('screening_responses')
            .select('id, score, responses')
            .eq('application_id', app.id)
            .maybeSingle();
          return { ...app, screening: sr };
        }));
        
        setApplications(appsWithScreening);
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

  const getStatusAction = (app: any) => {
    const status = app.status;
    // Check if screening exists and needs completion
    if (app.screening) {
      const responses = app.screening.responses as any;
      const hasAnswers = responses?.answers && Object.keys(responses.answers).length > 0;
      if (!hasAnswers) {
        return { label: 'Complete Screening', icon: ClipboardCheck, path: `/screening?applicationId=${app.id}` };
      }
    }
    switch (status) {
      case 'screening': return { label: 'Complete Screening', icon: ClipboardCheck, path: `/screening?applicationId=${app.id}` };
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-0 p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Welcome back, {fullName?.split(' ')[0] || 'Candidate'} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your application progress below.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/auth'); }} className="gap-1.5 shrink-0">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      {/* Applications with pipeline */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">My Applications</h3>
        {applications.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground">No applications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Browse open positions and apply.</p>
            <Button className="mt-4 gap-1.5" onClick={() => navigate('/jobs')}>
              <Briefcase className="h-4 w-4" /> Browse Jobs
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app: any) => (
              <ApplicationPipeline key={app.id} app={app} onAction={(path) => navigate(path)} />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/jobs')}
          className="rounded-2xl border bg-card p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors text-left">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><Briefcase className="h-4 w-4" /></div>
          <div><p className="text-sm font-semibold">Browse Jobs</p><p className="text-xs text-muted-foreground">Find more positions</p></div>
        </button>
        <button onClick={() => navigate('/inbox')}
          className="rounded-2xl border bg-card p-4 flex items-center gap-3 hover:bg-accent/40 transition-colors text-left">
          <div className="p-2 rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></div>
          <div><p className="text-sm font-semibold">Messages</p><p className="text-xs text-muted-foreground">Check your inbox</p></div>
        </button>
      </div>

      {/* Company social links */}
      {socialLinks && Object.values(socialLinks).some(Boolean) && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Follow Us</h3>
          <div className="flex flex-wrap gap-2">
            {socialIcons.map(({ key, icon: Icon, label }) => {
              const url = socialLinks[key];
              if (!url) return null;
              return (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border hover:bg-accent transition-colors text-sm">
                  <Icon className="h-4 w-4" /> {label}
                </a>
              );
            })}
            {socialLinks.social_tiktok && (
              <a href={socialLinks.social_tiktok} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border hover:bg-accent transition-colors text-sm">
                TikTok
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading, signOut, hasCapability } = useAuth();

  const [accessCodeModal, setAccessCodeModal] = useState<{ open: boolean; passcode: string }>({ open: false, passcode: '' });
  useEffect(() => {
    const showFlag = (location.state as any)?.showAccessCode;
    if (showFlag && user) {
      (async () => {
        const { data } = await (supabase as any).from('profiles').select('passcode, passcode_acknowledged').eq('id', user.id).maybeSingle();
        if (data && !data.passcode_acknowledged && data.passcode && data.passcode !== '00000000') {
          setAccessCodeModal({ open: true, passcode: data.passcode });
        }
        window.history.replaceState({}, document.title);
      })();
    }
  }, [user, location.state]);

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

  // Stat-cards-only date range filter. Affects ONLY the metric cards at the top of
  // the admin dashboard - the charts, expense breakdown, data entry and cashflow
  // alert below continue to use the current-week figures.
  type CardPeriod = 'week' | 'month' | 'quarter' | 'lifetime' | 'custom';
  const [allWeeklyRecords, setAllWeeklyRecords] = useState<any[]>([]);
  const [cardPeriod, setCardPeriod] = useState<CardPeriod>('week');
  const [cardFrom, setCardFrom] = useState<Date | undefined>(undefined);
  const [cardTo, setCardTo] = useState<Date | undefined>(undefined);

  const fetchAllWeeklyRecords = useCallback(async () => {
    if (!user || role === 'employee' || role === 'candidate') return;
    const { data, error } = await (supabase as any)
      .from('weekly_records')
      .select('year, week_number, total_income, total_expenses, net_cashflow');
    if (!error && data) setAllWeeklyRecords(data);
  }, [user, role]);

  useEffect(() => {
    fetchAllWeeklyRecords();
  }, [fetchAllWeeklyRecords]);

  const cardPeriodRange = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    const start = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    if (cardPeriod === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: start(d), to: now }; }
    if (cardPeriod === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start(d), to: now }; }
    if (cardPeriod === 'quarter') { const q = Math.floor(now.getMonth() / 3); const d = new Date(now.getFullYear(), q * 3, 1); return { from: start(d), to: now }; }
    if (cardPeriod === 'custom') return { from: cardFrom ? start(cardFrom) : null, to: cardTo ?? null };
    return { from: null, to: null }; // lifetime
  }, [cardPeriod, cardFrom, cardTo]);

  const cardMetrics = useMemo(() => {
    const { from, to } = cardPeriodRange;
    const inRange = (d: Date) => {
      if (!from && !to) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };
    const filtered = allWeeklyRecords.filter((r: any) =>
      inRange(getDateOfISOWeek(Number(r.week_number), Number(r.year)))
    );
    const income = filtered.reduce((s: number, r: any) => s + Number(r.total_income || 0), 0);
    const expenses = filtered.reduce((s: number, r: any) => s + Number(r.total_expenses || 0), 0);
    return { income, expenses, netCashflow: income - expenses };
  }, [allWeeklyRecords, cardPeriodRange]);

  const cardPeriodLabel = cardPeriod === 'week' ? 'Past Week'
    : cardPeriod === 'month' ? 'This Month'
    : cardPeriod === 'quarter' ? 'This Quarter'
    : cardPeriod === 'lifetime' ? 'Lifetime'
    : 'Selected Range';

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
    fetchAllWeeklyRecords();
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

  // Candidate role
  if (role === 'candidate') {
    return (
      <DashboardLayout title="Candidate Dashboard">
        <CandidateDashboard />
      </DashboardLayout>
    );
  }

  // Employee role: personalized dashboard (no access to admin financial dashboard)
  if (role === 'employee') {
    return (
      <DashboardLayout title="My Dashboard">
        <EmployeeDashboard />
        {user && (
          <AccessCodeModal
            open={accessCodeModal.open}
            passcode={accessCodeModal.passcode}
            userId={user.id}
            onAcknowledged={() => setAccessCodeModal({ open: false, passcode: '' })}
          />
        )}
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

        <div className="space-y-3">
          <Card className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Stat range:</span>
            {(['week', 'month', 'quarter', 'lifetime', 'custom'] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={cardPeriod === p ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => setCardPeriod(p)}
              >
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : p === 'quarter' ? 'Quarterly' : p === 'lifetime' ? 'Lifetime' : 'Custom'}
              </Button>
            ))}
            {cardPeriod === 'custom' && (
              <div className="flex items-center gap-1 ml-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                      <CalendarIcon className="h-3 w-3" />{cardFrom ? format(cardFrom, 'MMM d, yyyy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={cardFrom} onSelect={setCardFrom} /></PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                      <CalendarIcon className="h-3 w-3" />{cardTo ? format(cardTo, 'MMM d, yyyy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={cardTo} onSelect={setCardTo} /></PopoverContent>
                </Popover>
              </div>
            )}
          </Card>

          <MetricCards data={cardMetrics} periodLabel={cardPeriodLabel} />
        </div>

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
              <AIAssistantPanel storageKey="fdl_ai_copilot_history_dashboard" heightClass="h-[65vh]" />
            ) : (
              <Card className="financial-card p-8 text-center"><p className="text-muted-foreground">Access restricted to administrators</p></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>;
};
export default Index;
