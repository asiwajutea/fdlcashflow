import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['hsl(var(--success))', 'hsl(var(--danger))', 'hsl(var(--warning))', 'hsl(var(--primary))'];

  return (
    <div className="space-y-8">
      {/* Weekly Cashflow Chart */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Weekly Cashflow Trend</h3>
            <p className="text-sm text-muted-foreground">Income vs Expenses over time</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-dark))" />
            <XAxis 
              dataKey="week" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
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
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(var(--success))" 
              strokeWidth={3}
              name="Income"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="hsl(var(--danger))" 
              strokeWidth={3}
              name="Expenses"
            />
            <Line 
              type="monotone" 
              dataKey="netCashflow" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Net Cashflow"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Categories Bar Chart */}
        <Card className="financial-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-warning/10 p-2 rounded-lg">
              <BarChart3 className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Monthly Expenses</h3>
              <p className="text-sm text-muted-foreground">Breakdown by category</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-dark))" />
              <XAxis 
                dataKey="category" 
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
              <Bar dataKey="amount" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Income vs Expenses Pie Chart */}
        <Card className="financial-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-success/10 p-2 rounded-lg">
              <PieChartIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Income Distribution</h3>
              <p className="text-sm text-muted-foreground">Revenue sources breakdown</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.incomeVsExpenses}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.incomeVsExpenses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--card-border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};