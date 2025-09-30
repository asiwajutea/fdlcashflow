import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HistoryRecord {
  id: string;
  week_number: number;
  year: number;
  field_work: number;
  data_entry: number;
  bac_audit: number;
  metadata_audit: number;
  virtual_audit: number;
  booklet_income: number;
  total_income: number;
  total_expenses: number;
  net_cashflow: number;
  created_at: string;
}

export const HistoryView: React.FC = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expenses'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, filterType, startDate, endDate]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_records')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Apply date filters
    if (startDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate <= new Date(endDate);
      });
    }

    setFilteredRecords(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalIncome = filteredRecords.reduce((sum, record) => sum + record.total_income, 0);
  const totalExpenses = filteredRecords.reduce((sum, record) => sum + record.total_expenses, 0);
  const totalNetCashflow = totalIncome - totalExpenses;

  if (loading) {
    return (
      <Card className="financial-card p-8">
        <p className="text-center text-muted-foreground">Loading history...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="financial-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success" />
          </div>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-danger" />
          </div>
        </Card>

        <Card className="financial-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Cashflow</p>
              <p className={`text-2xl font-bold ${totalNetCashflow >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(totalNetCashflow)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="filterType" className="text-sm font-medium mb-2 block">
              View Type
            </Label>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expenses">Expenses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate" className="text-sm font-medium mb-2 block">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card className="financial-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Weekly History</h3>
        </div>

        {filteredRecords.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No records found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Date</TableHead>
                  {(filterType === 'all' || filterType === 'income') && (
                    <TableHead className="text-right">Income</TableHead>
                  )}
                  {(filterType === 'all' || filterType === 'expenses') && (
                    <TableHead className="text-right">Expenses</TableHead>
                  )}
                  <TableHead className="text-right">Net Cashflow</TableHead>
                  <TableHead className="text-right">Work Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      Week {record.week_number}, {record.year}
                    </TableCell>
                    <TableCell>
                      {new Date(record.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    {(filterType === 'all' || filterType === 'income') && (
                      <TableCell className="text-right text-success font-medium">
                        {formatCurrency(record.total_income)}
                      </TableCell>
                    )}
                    {(filterType === 'all' || filterType === 'expenses') && (
                      <TableCell className="text-right text-danger font-medium">
                        {formatCurrency(record.total_expenses)}
                      </TableCell>
                    )}
                    <TableCell className={`text-right font-medium ${record.net_cashflow >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(record.net_cashflow)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {record.field_work + record.data_entry + record.bac_audit + 
                       record.metadata_audit + record.virtual_audit} names
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
