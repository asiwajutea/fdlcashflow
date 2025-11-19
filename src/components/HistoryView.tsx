import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { History, TrendingUp, TrendingDown, DollarSign, Settings, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditWeeklyRecordDialog } from './EditWeeklyRecordDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  other_expenses?: any[];
}
interface RateChangeRecord {
  id: string;
  changed_at: string;
  change_summary: string | null;
  new_config: any;
  previous_config: any;
}
export const HistoryView: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [rateChanges, setRateChanges] = useState<RateChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    viewType: 'all'
  });
  const [editingRecord, setEditingRecord] = useState<HistoryRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const {
    toast
  } = useToast();
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('weekly_records').select('*').order('year', {
        ascending: false
      }).order('week_number', {
        ascending: false
      });
      if (error) throw error;
      setRecords((data || []) as HistoryRecord[]);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchRateChanges = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('rate_change_history').select('*').order('changed_at', {
        ascending: false
      });
      if (error) throw error;
      setRateChanges(data || []);
    } catch (error) {
      console.error('Error fetching rate changes:', error);
    }
  };
  useEffect(() => {
    fetchRecords();
    fetchRateChanges();
  }, []);
  const applyFilters = () => {
    let filtered = [...records];
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate <= endDate;
      });
    }
    if (filters.viewType === 'positive') {
      filtered = filtered.filter(record => record.net_cashflow > 0);
    } else if (filters.viewType === 'negative') {
      filtered = filtered.filter(record => record.net_cashflow < 0);
    }
    return filtered;
  };
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      viewType: 'all'
    });
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const filteredRecords = applyFilters();
  const totalIncome = filteredRecords.reduce((sum, record) => sum + record.total_income, 0);
  const totalExpenses = filteredRecords.reduce((sum, record) => sum + record.total_expenses, 0);
  const totalNetCashflow = totalIncome - totalExpenses;
  const handleEditClick = (record: HistoryRecord) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };
  const handleEditSuccess = () => {
    fetchRecords();
  };
  const handleDeleteRecord = async (record: HistoryRecord) => {
    try {
      const {
        error
      } = await supabase.from('weekly_records').delete().eq('id', record.id);
      if (error) throw error;
      toast({
        title: 'Record deleted',
        description: `Week ${record.week_number}, ${record.year} has been deleted successfully.`
      });
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete record. Please try again.',
        variant: 'destructive'
      });
    }
  };
  return <div className="space-y-6">
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Records</TabsTrigger>
          <TabsTrigger value="rates">Rate Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="financial-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filteredRecords.length} weeks</p>
            </Card>

            <Card className="financial-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
                <TrendingDown className="h-4 w-4 text-danger" />
              </div>
              <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filteredRecords.length} weeks</p>
            </Card>

            <Card className="financial-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Net Cashflow</h3>
                <DollarSign className={`h-4 w-4 ${totalNetCashflow >= 0 ? 'text-success' : 'text-danger'}`} />
              </div>
              <p className={`text-2xl font-bold ${totalNetCashflow >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(totalNetCashflow)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{filteredRecords.length} weeks</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="financial-card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <History className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-800">Filter Records</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={filters.startDate} onChange={e => setFilters({
                ...filters,
                startDate: e.target.value
              })} />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={filters.endDate} onChange={e => setFilters({
                ...filters,
                endDate: e.target.value
              })} />
              </div>

              <div>
                <Label htmlFor="viewType">View Type</Label>
                <Select value={filters.viewType} onValueChange={value => setFilters({
                ...filters,
                viewType: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="positive">Positive Cashflow</SelectItem>
                    <SelectItem value="negative">Negative Cashflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Records Table */}
          <Card className="financial-card p-6">
            {loading ? <div className="text-center py-8">
                <p className="text-muted-foreground">Loading records...</p>
              </div> : filteredRecords.length === 0 ? <div className="text-center py-8">
                <p className="text-muted-foreground">No records found</p>
              </div> : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Field Work</TableHead>
                      <TableHead className="text-right">Data Entry</TableHead>
                      <TableHead className="text-right">Audits</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Cashflow</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          Week {record.week_number}, {record.year}
                        </TableCell>
                        <TableCell>{formatDate(record.created_at)}</TableCell>
                        <TableCell className="text-right">{record.field_work}</TableCell>
                        <TableCell className="text-right">{record.data_entry}</TableCell>
                        <TableCell className="text-right">
                          {record.bac_audit + record.metadata_audit + record.virtual_audit}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrency(record.total_income)}
                        </TableCell>
                        <TableCell className="text-right text-danger">
                          {formatCurrency(record.total_expenses)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${record.net_cashflow >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(record.net_cashflow)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete Week {record.week_number}, {record.year}? 
                                    This action cannot be undone and will remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteRecord(record)} className="bg-danger hover:bg-danger/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>}
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-6">
          <Card className="financial-card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Rate Configuration History</h3>
                <p className="text-sm text-muted-foreground">Track all changes made to income and expense rates</p>
              </div>
            </div>

            {rateChanges.length === 0 ? <div className="text-center py-8">
                <p className="text-muted-foreground">No rate changes recorded yet</p>
              </div> : <div className="space-y-4">
                {rateChanges.map(change => <Card key={change.id} className="p-4 bg-muted/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {change.change_summary || 'Rate Configuration Updated'}
                        </h4>
                        <p className="text-sm text-slate-200">
                          {formatDate(change.changed_at)}
                        </p>
                      </div>
                    </div>
                    
                    {change.new_config && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-green-300">Income Rates</h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-100">Field Work: ₦{change.new_config.field_work_rate}</p>
                            <p className="text-slate-100">Data Entry: ₦{change.new_config.data_entry_rate}</p>
                            <p className="text-slate-100">BAC Audit: ₦{change.new_config.bac_audit_rate}</p>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-red-200">Expense Rates</h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-100">Logistics: {(change.new_config.logistics_rate * 100).toFixed(1)}%</p>
                            <p className="text-slate-200">Incentives: {(change.new_config.incentives_rate * 100).toFixed(1)}%</p>
                            <p className="text-slate-200">Gratuity: {(change.new_config.employee_gratuity_rate * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>}
                  </Card>)}
              </div>}
          </Card>
        </TabsContent>
      </Tabs>

      <EditWeeklyRecordDialog record={editingRecord} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSuccess={handleEditSuccess} />
    </div>;
};