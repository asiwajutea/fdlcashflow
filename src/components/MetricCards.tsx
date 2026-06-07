import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricData {
  income: number;
  expenses: number;
  netCashflow: number;
}

interface MetricCardsProps {
  data: MetricData;
  /** Label for the active stat range, e.g. "This Month". Shown as a caption on each card. */
  periodLabel?: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ data, periodLabel }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const metrics = [
    {
      title: 'Income',
      value: data.income,
      icon: DollarSign,
      type: 'income' as const,
    },
    {
      title: 'Expenses',
      value: data.expenses,
      icon: TrendingDown,
      type: 'expense' as const,
    },
    {
      title: 'Net Cashflow',
      value: data.netCashflow,
      icon: data.netCashflow >= 0 ? TrendingUp : AlertTriangle,
      type: data.netCashflow >= 0 ? 'positive' : 'negative' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const isNegative = metric.type === 'negative';
        const isPositive = metric.type === 'positive';
        const isExpense = metric.type === 'expense';

        return (
          <Card key={index} className="financial-card p-6 hover:shadow-financial-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {periodLabel && (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-0.5">
                    {periodLabel}
                  </p>
                )}
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