import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Building, Zap, Calculator, Gift, Truck, Trophy } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  icon: React.ComponentType<any>;
  description: string;
}

interface ExpenseBreakdownProps {
  totalNames: number;
  weeklyIncome: number;
  expenseData: {
    perNameExpenses: number;
    productionManager: number;
    fixedSalaries: number;
    weeklyExpenses: number;
    employeeGratuity: number;
  };
  logistics: number;
  incentives: number;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  totalNames,
  weeklyIncome,
  expenseData,
  logistics,
  incentives
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = 
    expenseData.perNameExpenses +
    expenseData.productionManager +
    expenseData.fixedSalaries +
    expenseData.weeklyExpenses +
    expenseData.employeeGratuity +
    logistics +
    incentives;

  const categories: ExpenseCategory[] = [
    {
      name: 'Field Staff Salaries',
      amount: expenseData.perNameExpenses,
      icon: Users,
      description: `₦61 per name × ${totalNames} names`
    },
    {
      name: 'Production Management',
      amount: expenseData.productionManager,
      icon: Calculator,
      description: `₦8 avg per name × ${totalNames} names`
    },
    {
      name: 'Fixed Monthly Salaries',
      amount: expenseData.fixedSalaries,
      icon: Building,
      description: 'Supervisors & Admin (prorated)'
    },
    {
      name: 'Operations & Utilities',
      amount: expenseData.weeklyExpenses,
      icon: Zap,
      description: 'Power, data, support costs'
    },
    {
      name: 'Employee Gratuity',
      amount: expenseData.employeeGratuity,
      icon: Gift,
      description: '7.5% of total salaries'
    },
    {
      name: 'Logistics',
      amount: logistics,
      icon: Truck,
      description: '3% of weekly income'
    },
    {
      name: 'Incentives',
      amount: incentives,
      icon: Trophy,
      description: '2% of weekly income'
    }
  ];

  return (
    <Card className="financial-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Expense Breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Total Weekly Expenses: <span className="font-medium text-foreground">{formatCurrency(totalExpenses)}</span>
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => {
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

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Total Weekly Expenses</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
        </div>
      </div>
    </Card>
  );
};