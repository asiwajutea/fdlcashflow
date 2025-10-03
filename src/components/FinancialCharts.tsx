import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, BarChart3, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  weeklyData: Array<{
    week: string;
    income: number;
    expenses: number;
    netCashflow: number;
  }>;
  monthlyCategories: Array<{
    category: string;
    amount: number;
  }>;
  incomeVsExpenses: Array<{
    name: string;
    value: number;
  }>;
}

interface FinancialChartsProps {
  data: ChartData;
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ data }) => {
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [comparisonType, setComparisonType] = useState<'income' | 'expenses' | 'both'>('both');

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      const { data: records, error } = await supabase
        .from('weekly_records')
        .select('*')
        .order('year', { ascending: true })
        .order('week_number', { ascending: true });

      if (error) throw error;
      
      const formattedData = (records || []).map((record) => ({
        week: `W${record.week_number} ${record.year}`,
        weekNumber: record.week_number,
        year: record.year,
        income: record.total_income,
        expenses: record.total_expenses,
        netCashflow: record.net_cashflow,
        fieldWork: record.field_work,
        dataEntry: record.data_entry,
        audits: record.bac_audit + record.metadata_audit + record.virtual_audit
      }));

      setHistoricalData(formattedData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filterDataByTimeRange = () => {
    if (timeRange === 'all') return historicalData;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = Math.ceil((now.getDate()) / 7);

    if (timeRange === 'week') {
      return historicalData.slice(-4); // Last 4 weeks
    } else if (timeRange === 'month') {
      return historicalData.slice(-17); // Last ~4 months (17 weeks)
    }

    return historicalData;
  };

  const filteredData = filterDataByTimeRange();

  // Calculate monthly aggregated data
  const monthlyData = historicalData.reduce((acc: any[], record) => {
    const monthKey = `${record.year}-${Math.ceil(record.weekNumber / 4.33)}`;
    const existing = acc.find(item => item.month === monthKey);
    
    if (existing) {
      existing.income += record.income;
      existing.expenses += record.expenses;
      existing.netCashflow += record.netCashflow;
    } else {
      acc.push({
        month: `Month ${Math.ceil(record.weekNumber / 4.33)} ${record.year}`,
        income: record.income,
        expenses: record.expenses,
        netCashflow: record.netCashflow
      });
    }
    
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Chart Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeRange">Time Range</Label>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger id="timeRange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 4 Weeks</SelectItem>
                <SelectItem value="month">Last 4 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comparison">Comparison Type</Label>
            <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
              <SelectTrigger id="comparison">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Income & Expenses</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expenses">Expenses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Weekly Trend Chart */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Weekly Financial Trend</h3>
            <p className="text-sm text-muted-foreground">Track income, expenses and cashflow over time</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-dark))" />
            <XAxis 
              dataKey="week" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--card-border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {(comparisonType === 'both' || comparisonType === 'income') && (
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(var(--success))" 
                strokeWidth={3}
                name="Income"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {(comparisonType === 'both' || comparisonType === 'expenses') && (
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="hsl(var(--danger))" 
                strokeWidth={3}
                name="Expenses"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {comparisonType === 'both' && (
              <Line 
                type="monotone" 
                dataKey="netCashflow" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Net Cashflow"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly Comparison Chart */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-warning/10 p-2 rounded-lg">
            <BarChart3 className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Monthly Performance Comparison</h3>
            <p className="text-sm text-muted-foreground">Compare income vs expenses by month</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-dark))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--card-border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {(comparisonType === 'both' || comparisonType === 'income') && (
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Income" />
            )}
            {(comparisonType === 'both' || comparisonType === 'expenses') && (
              <Bar dataKey="expenses" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} name="Expenses" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Work Volume Analysis */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Work Volume Analysis</h3>
            <p className="text-sm text-muted-foreground">Track field work, data entry, and audits over time</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-dark))" />
            <XAxis 
              dataKey="week" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--card-border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="fieldWork" fill="hsl(var(--primary))" name="Field Work" />
            <Bar dataKey="dataEntry" fill="hsl(var(--warning))" name="Data Entry" />
            <Bar dataKey="audits" fill="hsl(var(--success))" name="Audits" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};