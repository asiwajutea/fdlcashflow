import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Building, Zap, Calculator, Gift, Truck, Trophy, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CategorySummary {
  name: string;
  amount: number;
  icon: React.ComponentType<any>;
  description: string;
}

export const MonthlySummary = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [summaryData, setSummaryData] = useState<CategorySummary[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSelectingFrom, setIsSelectingFrom] = useState(true);

  useEffect(() => {
    fetchSummaryData();
  }, [dateRange]);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_records')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        setSummaryData([]);
        setTotalIncome(0);
        setTotalExpenses(0);
        setLoading(false);
        return;
      }

      // Calculate expense rates (same as in Index.tsx)
      const fieldWorkSalaries = { fieldAgent: 25, fieldManager: 10, bookingAgent: 5, fieldRelation: 3, clerks: 10, qaManager: 3 };
      const fieldWorkExpenseRate = Object.values(fieldWorkSalaries).reduce((sum, rate) => sum + rate, 0);
      const productionManagerRates = { fieldWork: 20, dataEntry: 2, bacAudit: 2 };
      
      const fixedMonthlySalaries = {
        fieldRelationSupervisor: 80000 / 4.33,
        administrativeAssistant: 45000 / 4.33,
        fieldRelationOfficers: 100000 / 4.33
      };
      const fixedSalariesPerWeek = Object.values(fixedMonthlySalaries).reduce((sum, salary) => sum + salary, 0);

      const weeklyExpenses = {
        powerPlant: 15000,
        dataSubscriptionOffice: 5000,
        dataSupport: 5000 * 10 / 4.33
      };
      const operationsPerWeek = Object.values(weeklyExpenses).reduce((sum, expense) => sum + expense, 0);

      // Aggregate all categories
      let aggregated = {
        fieldWorkExpenses: 0,
        productionManagerFieldWork: 0,
        productionManagerDataEntry: 0,
        productionManagerBacAudit: 0,
        fixedSalaries: 0,
        weeklyExpenses: 0,
        employeeGratuity: 0,
        logistics: 0,
        incentives: 0,
        otherExpenses: [] as { name: string; amount: number }[]
      };

      let income = 0;

      data.forEach(record => {
        // Calculate expenses from work counts
        const fieldWorkExp = record.field_work * fieldWorkExpenseRate;
        const pmFieldWork = record.field_work * productionManagerRates.fieldWork;
        const pmDataEntry = record.data_entry * productionManagerRates.dataEntry;
        const pmBacAudit = record.bac_audit * productionManagerRates.bacAudit;

        const totalSalaries = fieldWorkExp + pmFieldWork + pmDataEntry + pmBacAudit + fixedSalariesPerWeek;
        const gratuity = totalSalaries * 0.075;

        // Income for logistics and incentives calculation
        const recordIncome = record.total_income;
        const logisticsExp = recordIncome * 0.03;
        const incentivesExp = recordIncome * 0.02;

        aggregated.fieldWorkExpenses += fieldWorkExp;
        aggregated.productionManagerFieldWork += pmFieldWork;
        aggregated.productionManagerDataEntry += pmDataEntry;
        aggregated.productionManagerBacAudit += pmBacAudit;
        aggregated.fixedSalaries += fixedSalariesPerWeek;
        aggregated.weeklyExpenses += operationsPerWeek;
        aggregated.employeeGratuity += gratuity;
        aggregated.logistics += logisticsExp;
        aggregated.incentives += incentivesExp;

        income += recordIncome;

        // Aggregate other expenses
        if (record.other_expenses && Array.isArray(record.other_expenses)) {
          (record.other_expenses as { name: string; amount: number }[]).forEach(exp => {
            const existing = aggregated.otherExpenses.find(e => e.name === exp.name);
            if (existing) {
              existing.amount += exp.amount;
            } else {
              aggregated.otherExpenses.push({ ...exp });
            }
          });
        }
      });

      const totalExp = aggregated.fieldWorkExpenses + 
                       aggregated.productionManagerFieldWork + 
                       aggregated.productionManagerDataEntry + 
                       aggregated.productionManagerBacAudit + 
                       aggregated.fixedSalaries + 
                       aggregated.weeklyExpenses + 
                       aggregated.employeeGratuity + 
                       aggregated.logistics + 
                       aggregated.incentives +
                       aggregated.otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const categories: CategorySummary[] = [
        {
          name: 'Field Staff Salaries',
          amount: aggregated.fieldWorkExpenses,
          icon: Users,
          description: 'Total field staff compensation'
        },
        {
          name: 'Production Manager (Field Work)',
          amount: aggregated.productionManagerFieldWork,
          icon: Calculator,
          description: 'Field work management costs'
        },
        {
          name: 'Production Manager (Data Entry)',
          amount: aggregated.productionManagerDataEntry,
          icon: Calculator,
          description: 'Data entry management costs'
        },
        {
          name: 'Production Manager (BAC Audit)',
          amount: aggregated.productionManagerBacAudit,
          icon: Calculator,
          description: 'BAC audit management costs'
        },
        {
          name: 'Fixed Monthly Salaries',
          amount: aggregated.fixedSalaries,
          icon: Building,
          description: 'Supervisors & Admin salaries'
        },
        {
          name: 'Operations & Utilities',
          amount: aggregated.weeklyExpenses,
          icon: Zap,
          description: 'Power, data, support costs'
        },
        {
          name: 'Employee Gratuity',
          amount: aggregated.employeeGratuity,
          icon: Gift,
          description: '7.5% of total salaries'
        },
        {
          name: 'Logistics',
          amount: aggregated.logistics,
          icon: Truck,
          description: '3% of income'
        },
        {
          name: 'Incentives',
          amount: aggregated.incentives,
          icon: Trophy,
          description: '2% of income'
        },
        ...aggregated.otherExpenses.map(exp => ({
          name: exp.name,
          amount: exp.amount,
          icon: DollarSign,
          description: 'Custom expense'
        }))
      ];

      setSummaryData(categories.filter(cat => cat.amount > 0));
      setTotalIncome(income);
      setTotalExpenses(totalExp);
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (isSelectingFrom) {
      setDateRange({ from: date, to: dateRange.to });
      setIsSelectingFrom(false);
    } else {
      if (date < dateRange.from) {
        setDateRange({ from: date, to: dateRange.from });
      } else {
        setDateRange({ from: dateRange.from, to: date });
      }
      setIsSelectingFrom(true);
    }
  };

  const resetToCurrentMonth = () => {
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setIsSelectingFrom(true);
  };

  return (
    <Card className="financial-card p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Monthly Expense Summary</h3>
            <p className="text-sm text-muted-foreground">
              Period: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetToCurrentMonth}>
              Current Month
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{isSelectingFrom ? 'From' : 'To'} Date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={isSelectingFrom ? dateRange.from : dateRange.to}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Total Income</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="p-4 bg-danger/5 border-danger/20">
          <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading summary data...</p>
        </div>
      ) : summaryData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaryData.map((category, index) => {
            const Icon = category.icon;
            const percentage = totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(category.amount)}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Total Expenses (Period)</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-muted-foreground">Net Cashflow</span>
          <span className={cn(
            "text-lg font-bold",
            totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(totalIncome - totalExpenses)}
          </span>
        </div>
      </div>
    </Card>
  );
};
