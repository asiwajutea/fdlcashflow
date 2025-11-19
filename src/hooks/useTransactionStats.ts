import { useMemo } from 'react';
import { Transaction } from './useTransactions';

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  monthlyComparison: Array<{ month: string; income: number; expense: number; net: number }>;
}

export const useTransactionStats = (transactions: Transaction[]): TransactionStats => {
  return useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeByCategory = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const expenseByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    // Group by date for trend
    const dailyData = transactions.reduce((acc, t) => {
      const date = t.date;
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        acc[date].income += Number(t.amount);
      } else {
        acc[date].expense += Number(t.amount);
      }
      return acc;
    }, {} as Record<string, { date: string; income: number; expense: number }>);

    const dailyTrend = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by month for comparison
    const monthlyData = transactions.reduce((acc, t) => {
      const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0, net: 0 };
      }
      if (t.type === 'income') {
        acc[month].income += Number(t.amount);
      } else {
        acc[month].expense += Number(t.amount);
      }
      acc[month].net = acc[month].income - acc[month].expense;
      return acc;
    }, {} as Record<string, { month: string; income: number; expense: number; net: number }>);

    const monthlyComparison = Object.values(monthlyData).slice(-12); // Last 12 months

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      incomeByCategory,
      expenseByCategory,
      dailyTrend,
      monthlyComparison
    };
  }, [transactions]);
};
