import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const BudgetCalculator = () => {
  const [projections, setProjections] = useState({
    fieldWork: 0,
    dataEntry: 0,
    bacAudit: 0,
    metadataAudit: 0,
    virtualAudit: 0,
    bookletProduction: 0,
  });

  const [rateConfig, setRateConfig] = useState<any>(null);

  useEffect(() => {
    const fetchRates = async () => {
      const { data, error } = await supabase
        .from('rate_configurations')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setRateConfig(data);
      }
    };
    fetchRates();
  }, []);

  const INCOME_RATES = rateConfig ? {
    fieldWork: rateConfig.field_work_rate,
    dataEntry: rateConfig.data_entry_rate,
    bacAudit: rateConfig.bac_audit_rate,
    metadataAudit: rateConfig.metadata_audit_rate,
    virtualAudit: rateConfig.virtual_audit_rate
  } : {
    fieldWork: 90,
    dataEntry: 15,
    bacAudit: 5,
    metadataAudit: 5,
    virtualAudit: 5
  };

  const MONTHLY_BOOKLET_INCOME = rateConfig?.booklet_monthly_income || 65000;
  const WEEKLY_BOOKLET_INCOME = MONTHLY_BOOKLET_INCOME / 4.33;

  const calculateExpenses = (fieldWorkNames: number, dataEntryNames: number = 0, bacAuditNames: number = 0) => {
    if (!rateConfig) {
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

    const fieldStaffSalariesPerName = 
      rateConfig.field_agent_rate +
      rateConfig.field_manager_rate +
      rateConfig.booking_agent_rate +
      rateConfig.field_relation_rate +
      rateConfig.field_misc_rate;

    const fieldWorkExpenses = fieldWorkNames * fieldStaffSalariesPerName;

    const dataEntryPerName = 
      rateConfig.data_entry_clerks_rate +
      rateConfig.qa_manager_rate +
      rateConfig.data_entry_misc_rate;

    const dataEntryExpenses = dataEntryNames * dataEntryPerName;

    const productionManagerFieldWork = fieldWorkNames * rateConfig.pm_field_work_rate;
    const productionManagerDataEntry = dataEntryNames * rateConfig.pm_data_entry_rate;
    const productionManagerBacAudit = bacAuditNames * rateConfig.pm_bac_audit_rate;

    const fixedSalaries = (
      rateConfig.field_relation_supervisor_salary +
      rateConfig.administrative_assistant_salary +
      rateConfig.field_relation_officers_salary
    ) / 4.33;

    const weeklyExpenses = (
      rateConfig.power_plant_monthly +
      rateConfig.office_data_subscription_monthly +
      rateConfig.staff_data_support_monthly
    ) / 4.33;

    const totalSalaries = 
      fieldWorkExpenses + 
      dataEntryExpenses +
      productionManagerFieldWork + 
      productionManagerDataEntry + 
      productionManagerBacAudit + 
      fixedSalaries;

    const employeeGratuity = totalSalaries * rateConfig.employee_gratuity_rate;

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

  const projectedMetrics = useMemo(() => {
    const weeklyIncome = 
      projections.fieldWork * INCOME_RATES.fieldWork + 
      projections.dataEntry * INCOME_RATES.dataEntry + 
      projections.bacAudit * INCOME_RATES.bacAudit + 
      projections.metadataAudit * INCOME_RATES.metadataAudit + 
      projections.virtualAudit * INCOME_RATES.virtualAudit + 
      projections.bookletProduction;

    const expenseBreakdown = calculateExpenses(
      projections.fieldWork, 
      projections.dataEntry, 
      projections.bacAudit
    );

    const logistics = rateConfig ? weeklyIncome * rateConfig.logistics_rate : weeklyIncome * 0.03;
    const incentives = rateConfig ? weeklyIncome * rateConfig.incentives_rate : weeklyIncome * 0.02;
    
    const weeklyExpenses = 
      expenseBreakdown.fieldWorkExpenses + 
      expenseBreakdown.productionManagerFieldWork + 
      expenseBreakdown.productionManagerDataEntry + 
      expenseBreakdown.productionManagerBacAudit + 
      expenseBreakdown.fixedSalaries + 
      expenseBreakdown.weeklyExpenses + 
      expenseBreakdown.employeeGratuity + 
      logistics + 
      incentives;

    const monthlyIncome = weeklyIncome * 4.33;
    const monthlyExpenses = weeklyExpenses * 4.33;

    return {
      weeklyIncome,
      weeklyExpenses,
      monthlyIncome,
      monthlyExpenses,
      weeklyNetCashflow: weeklyIncome - weeklyExpenses,
      monthlyNetCashflow: monthlyIncome - monthlyExpenses,
      expenseBreakdown: {
        ...expenseBreakdown,
        logistics,
        incentives
      }
    };
  }, [projections, rateConfig]);

  const handleInputChange = (field: keyof typeof projections, value: string) => {
    const numValue = parseInt(value) || 0;
    setProjections(prev => ({ ...prev, [field]: numValue }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const logisticsRate = rateConfig ? (rateConfig.logistics_rate * 100) : 3;
  const incentivesRate = rateConfig ? (rateConfig.incentives_rate * 100) : 2;
  const gratuityRate = rateConfig ? (rateConfig.employee_gratuity_rate * 100) : 7.5;

  return (
    <div className="space-y-6">
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Calculator className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Budget Calculator</h2>
            <p className="text-sm text-muted-foreground">Project your income and expenses for planning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fieldWork">Field Work Names</Label>
            <Input
              id="fieldWork"
              type="number"
              min="0"
              value={projections.fieldWork || ''}
              onChange={(e) => handleInputChange('fieldWork', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">₦{INCOME_RATES.fieldWork} per name</p>
          </div>

          <div>
            <Label htmlFor="dataEntry">Data Entry Names</Label>
            <Input
              id="dataEntry"
              type="number"
              min="0"
              value={projections.dataEntry || ''}
              onChange={(e) => handleInputChange('dataEntry', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">₦{INCOME_RATES.dataEntry} per name</p>
          </div>

          <div>
            <Label htmlFor="bacAudit">BAC Audit Names</Label>
            <Input
              id="bacAudit"
              type="number"
              min="0"
              value={projections.bacAudit || ''}
              onChange={(e) => handleInputChange('bacAudit', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">₦{INCOME_RATES.bacAudit} per name</p>
          </div>

          <div>
            <Label htmlFor="metadataAudit">Metadata Audit Names</Label>
            <Input
              id="metadataAudit"
              type="number"
              min="0"
              value={projections.metadataAudit || ''}
              onChange={(e) => handleInputChange('metadataAudit', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">₦{INCOME_RATES.metadataAudit} per name</p>
          </div>

          <div>
            <Label htmlFor="virtualAudit">Virtual Audit Names</Label>
            <Input
              id="virtualAudit"
              type="number"
              min="0"
              value={projections.virtualAudit || ''}
              onChange={(e) => handleInputChange('virtualAudit', e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">₦{INCOME_RATES.virtualAudit} per name</p>
          </div>

          <div>
            <Label htmlFor="bookletProduction">Booklet Income (Weekly)</Label>
            <Input
              id="bookletProduction"
              type="number"
              min="0"
              value={projections.bookletProduction || ''}
              onChange={(e) => handleInputChange('bookletProduction', e.target.value)}
              placeholder={Math.round(WEEKLY_BOOKLET_INCOME).toString()}
            />
            <p className="text-xs text-muted-foreground mt-1">Monthly fixed: ₦{MONTHLY_BOOKLET_INCOME.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Projected Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Weekly Income</h3>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(projectedMetrics.weeklyIncome)}</p>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Weekly Expenses</h3>
            <TrendingDown className="h-4 w-4 text-danger" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(projectedMetrics.weeklyExpenses)}</p>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Weekly Net</h3>
            <TrendingUp className={`h-4 w-4 ${projectedMetrics.weeklyNetCashflow >= 0 ? 'text-success' : 'text-danger'}`} />
          </div>
          <p className={`text-2xl font-bold ${projectedMetrics.weeklyNetCashflow >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(projectedMetrics.weeklyNetCashflow)}
          </p>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Monthly Income</h3>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(projectedMetrics.monthlyIncome)}</p>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Monthly Expenses</h3>
            <TrendingDown className="h-4 w-4 text-danger" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(projectedMetrics.monthlyExpenses)}</p>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Projected Monthly Net</h3>
            <TrendingUp className={`h-4 w-4 ${projectedMetrics.monthlyNetCashflow >= 0 ? 'text-success' : 'text-danger'}`} />
          </div>
          <p className={`text-2xl font-bold ${projectedMetrics.monthlyNetCashflow >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(projectedMetrics.monthlyNetCashflow)}
          </p>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card className="financial-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Projected Expense Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Field Staff Salaries</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.fieldWorkExpenses)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Production Manager (Field Work)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.productionManagerFieldWork)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Production Manager (Data Entry)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.productionManagerDataEntry)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Production Manager (BAC Audit)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.productionManagerBacAudit)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Fixed Monthly Salaries (Prorated)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.fixedSalaries)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Operations & Utilities (Prorated)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.weeklyExpenses)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Employee Gratuity ({gratuityRate.toFixed(1)}%)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.employeeGratuity)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Logistics ({logisticsRate.toFixed(1)}%)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.logistics)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Incentives ({incentivesRate.toFixed(1)}%)</span>
            <span className="font-semibold text-foreground">{formatCurrency(projectedMetrics.expenseBreakdown.incentives)}</span>
          </div>
          <div className="border-t pt-3 mt-3 flex justify-between items-center">
            <span className="font-semibold text-foreground">Total Weekly Expenses</span>
            <span className="font-bold text-lg text-foreground">{formatCurrency(projectedMetrics.weeklyExpenses)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};