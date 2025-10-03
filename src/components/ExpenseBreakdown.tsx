import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Building, Zap, Calculator, Gift, Truck, Trophy, Edit3, Check, X, Plus, Trash2, DollarSign } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  icon: React.ComponentType<any>;
  description: string;
}

interface OtherExpense {
  name: string;
  amount: number;
}

interface ExpenseBreakdownProps {
  totalNames: number;
  fieldWorkNames: number;
  weeklyIncome: number;
  expenseData: {
    fieldWorkExpenses: number;
    productionManagerFieldWork: number;
    productionManagerDataEntry: number;
    productionManagerBacAudit: number;
    fixedSalaries: number;
    weeklyExpenses: number;
    employeeGratuity: number;
  };
  logistics: number;
  incentives: number;
  otherExpenses?: OtherExpense[];
  rateConfig?: any;
  onExpenseChange?: (updatedExpenses: {
    fieldWorkExpenses: number;
    productionManagerFieldWork: number;
    productionManagerDataEntry: number;
    productionManagerBacAudit: number;
    fixedSalaries: number;
    weeklyExpenses: number;
    employeeGratuity: number;
    logistics: number;
    incentives: number;
    otherExpenses: OtherExpense[];
  }) => void;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  totalNames,
  fieldWorkNames,
  weeklyIncome,
  expenseData,
  logistics,
  incentives,
  otherExpenses = [],
  rateConfig,
  onExpenseChange
}) => {
  const [editableExpenses, setEditableExpenses] = useState({
    fieldWorkExpenses: expenseData.fieldWorkExpenses,
    productionManagerFieldWork: expenseData.productionManagerFieldWork,
    productionManagerDataEntry: expenseData.productionManagerDataEntry,
    productionManagerBacAudit: expenseData.productionManagerBacAudit,
    fixedSalaries: expenseData.fixedSalaries,
    weeklyExpenses: expenseData.weeklyExpenses,
    employeeGratuity: expenseData.employeeGratuity,
    logistics,
    incentives
  });
  
  const [editableOtherExpenses, setEditableOtherExpenses] = useState<OtherExpense[]>(otherExpenses);
  const [isEditing, setIsEditing] = useState(false);
  const [tempExpenses, setTempExpenses] = useState(editableExpenses);
  const [tempOtherExpenses, setTempOtherExpenses] = useState<OtherExpense[]>(otherExpenses);

  // Update editable expenses when props change (automatic calculation)
  useEffect(() => {
    if (!isEditing) {
      const newExpenses = {
        fieldWorkExpenses: expenseData.fieldWorkExpenses,
        productionManagerFieldWork: expenseData.productionManagerFieldWork,
        productionManagerDataEntry: expenseData.productionManagerDataEntry,
        productionManagerBacAudit: expenseData.productionManagerBacAudit,
        fixedSalaries: expenseData.fixedSalaries,
        weeklyExpenses: expenseData.weeklyExpenses,
        employeeGratuity: expenseData.employeeGratuity,
        logistics,
        incentives
      };
      setEditableExpenses(newExpenses);
      setTempExpenses(newExpenses);
      setEditableOtherExpenses(otherExpenses);
      setTempOtherExpenses(otherExpenses);
    }
  }, [expenseData, logistics, incentives, otherExpenses, isEditing]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSaveChanges = () => {
    setEditableExpenses(tempExpenses);
    setEditableOtherExpenses(tempOtherExpenses);
    setIsEditing(false);
    if (onExpenseChange) {
      onExpenseChange({
        ...tempExpenses,
        otherExpenses: tempOtherExpenses
      });
    }
  };

  const handleCancelChanges = () => {
    setTempExpenses(editableExpenses);
    setTempOtherExpenses(editableOtherExpenses);
    setIsEditing(false);
  };

  const handleExpenseChange = (field: keyof typeof tempExpenses, value: number) => {
    setTempExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddOtherExpense = () => {
    setTempOtherExpenses([...tempOtherExpenses, { name: '', amount: 0 }]);
  };

  const handleRemoveOtherExpense = (index: number) => {
    setTempOtherExpenses(tempOtherExpenses.filter((_, i) => i !== index));
  };

  const handleOtherExpenseChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...tempOtherExpenses];
    if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].amount = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    }
    setTempOtherExpenses(updated);
  };

  const currentExpenses = isEditing ? tempExpenses : editableExpenses;
  const currentOtherExpenses = isEditing ? tempOtherExpenses : editableOtherExpenses;
  const otherExpensesTotal = currentOtherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const totalExpenses = 
    currentExpenses.fieldWorkExpenses +
    currentExpenses.productionManagerFieldWork +
    currentExpenses.productionManagerDataEntry +
    currentExpenses.productionManagerBacAudit +
    currentExpenses.fixedSalaries +
    currentExpenses.weeklyExpenses +
    currentExpenses.employeeGratuity +
    currentExpenses.logistics +
    currentExpenses.incentives +
    otherExpensesTotal;

  const fieldStaffRate = rateConfig ? (
    rateConfig.field_agent_rate + 
    rateConfig.field_manager_rate + 
    rateConfig.booking_agent_rate + 
    rateConfig.field_relation_rate + 
    rateConfig.field_misc_rate
  ) : 56;

  const logisticsRate = rateConfig ? (rateConfig.logistics_rate * 100) : 3;
  const incentivesRate = rateConfig ? (rateConfig.incentives_rate * 100) : 2;
  const gratuityRate = rateConfig ? (rateConfig.employee_gratuity_rate * 100) : 7.5;

  const categories: (ExpenseCategory & { field: keyof typeof currentExpenses })[] = [
    {
      name: 'Field Staff Salaries',
      amount: currentExpenses.fieldWorkExpenses,
      icon: Users,
      description: `₦${fieldStaffRate.toFixed(0)} per name × ${fieldWorkNames} field work names`,
      field: 'fieldWorkExpenses'
    },
    {
      name: 'Production Manager (Field Work)',
      amount: currentExpenses.productionManagerFieldWork,
      icon: Calculator,
      description: `₦${rateConfig?.pm_field_work_rate || 20} per name × ${fieldWorkNames} field work names`,
      field: 'productionManagerFieldWork'
    },
    {
      name: 'Production Manager (Data Entry)',
      amount: currentExpenses.productionManagerDataEntry,
      icon: Calculator,
      description: `₦${rateConfig?.pm_data_entry_rate || 2} per data entry name`,
      field: 'productionManagerDataEntry'
    },
    {
      name: 'Production Manager (BAC Audit)',
      amount: currentExpenses.productionManagerBacAudit,
      icon: Calculator,
      description: `₦${rateConfig?.pm_bac_audit_rate || 2} per BAC audit name`,
      field: 'productionManagerBacAudit'
    },
    {
      name: 'Fixed Monthly Salaries',
      amount: currentExpenses.fixedSalaries,
      icon: Building,
      description: 'Supervisors & Admin (prorated weekly)',
      field: 'fixedSalaries'
    },
    {
      name: 'Operations & Utilities',
      amount: currentExpenses.weeklyExpenses,
      icon: Zap,
      description: 'Power, office & staff data (prorated weekly)',
      field: 'weeklyExpenses'
    },
    {
      name: 'Employee Gratuity',
      amount: currentExpenses.employeeGratuity,
      icon: Gift,
      description: `${gratuityRate.toFixed(1)}% of total salaries`,
      field: 'employeeGratuity'
    },
    {
      name: 'Logistics',
      amount: currentExpenses.logistics,
      icon: Truck,
      description: `${logisticsRate.toFixed(1)}% of weekly income`,
      field: 'logistics'
    },
    {
      name: 'Incentives',
      amount: currentExpenses.incentives,
      icon: Trophy,
      description: `${incentivesRate.toFixed(1)}% of weekly income`,
      field: 'incentives'
    }
  ];

  return (
    <Card className="financial-card p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Expense Breakdown</h3>
            <p className="text-sm text-muted-foreground">
              Total Weekly Expenses: <span className="font-medium text-foreground">{formatCurrency(totalExpenses)}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveChanges}
                  className="flex items-center space-x-2 text-green-700 border-green-200 hover:bg-green-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Save</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelChanges}
                  className="flex items-center space-x-2 text-red-700 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              </div>
            )}
          </div>
        </div>
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
                  {isEditing ? (
                    <Input
                      type="number"
                      value={category.amount}
                      onChange={(e) => handleExpenseChange(category.field, parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-right text-sm"
                      min="0"
                      step="100"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(category.amount)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                </div>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </div>
          );
        })}
      </div>

      {/* Other Expenses Section */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground">Other Expenses</h4>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddOtherExpense}
              className="flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </Button>
          )}
        </div>

        {currentOtherExpenses.length > 0 ? (
          <div className="space-y-3">
            {currentOtherExpenses.map((expense, index) => {
              const percentage = totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={expense.name}
                            onChange={(e) => handleOtherExpenseChange(index, 'name', e.target.value)}
                            placeholder="Expense name"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">{expense.name || 'Unnamed Expense'}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => handleOtherExpenseChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-right text-sm"
                            min="0"
                            step="100"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOtherExpense(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No additional expenses</p>
        )}
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