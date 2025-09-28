import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricData {
  weeklyIncome: number;
  weeklyExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  weeklyNetCashflow: number;
  monthlyNetCashflow: number;
}

interface MetricCardsProps {
  data: MetricData;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const metrics = [
    {
      title: 'Weekly Income',
      value: data.weeklyIncome,
      icon: DollarSign,
      type: 'income' as const,
    },
    {
      title: 'Weekly Expenses',
      value: data.weeklyExpenses,
      icon: TrendingDown,
      type: 'expense' as const,
    },
    {
      title: 'Weekly Net Cashflow',
      value: data.weeklyNetCashflow,
      icon: data.weeklyNetCashflow >= 0 ? TrendingUp : AlertTriangle,
      type: data.weeklyNetCashflow >= 0 ? 'positive' : 'negative' as const,
    },
    {
      title: 'Monthly Net Cashflow',
      value: data.monthlyNetCashflow,
      icon: data.monthlyNetCashflow >= 0 ? TrendingUp : AlertTriangle,
      type: data.monthlyNetCashflow >= 0 ? 'positive' : 'negative' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const isNegative = metric.type === 'negative';
        const isPositive = metric.type === 'positive';
        const isExpense = metric.type === 'expense';

        return (
          <Card key={index} className="financial-card p-6 hover:shadow-financial-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {metric.title}
                </p>
                <p className={`text-2xl font-bold ${
                  isNegative 
                    ? 'text-danger' 
                    : isPositive 
                    ? 'text-success' 
                    : isExpense 
                    ? 'text-warning' 
                    : 'text-primary'
                }`}>
                  {formatCurrency(Math.abs(metric.value))}
                </p>
                {isNegative && (
                  <p className="text-xs text-danger-foreground bg-danger-background px-2 py-1 rounded-full inline-block mt-2">
                    Negative Cashflow
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${
                isNegative 
                  ? 'bg-danger-background' 
                  : isPositive 
                  ? 'bg-success-background' 
                  : isExpense 
                  ? 'bg-warning-background' 
                  : 'bg-primary/10'
              }`}>
                <Icon className={`h-6 w-6 ${
                  isNegative 
                    ? 'text-danger' 
                    : isPositive 
                    ? 'text-success' 
                    : isExpense 
                    ? 'text-warning' 
                    : 'text-primary'
                }`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};