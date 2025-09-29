import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Building, Zap, Calculator, Gift, Truck, Trophy, Edit3, Check, X } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  icon: React.ComponentType<any>;
  description: string;
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
  }) => void;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  totalNames,
  fieldWorkNames,
  weeklyIncome,
  expenseData,
  logistics,
  incentives,
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempExpenses, setTempExpenses] = useState(editableExpenses);

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
    }
  }, [expenseData, logistics, incentives, isEditing]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSaveChanges = () => {
    setEditableExpenses(tempExpenses);
    setIsEditing(false);
    if (onExpenseChange) {
      onExpenseChange(tempExpenses);
    }
  };

  const handleCancelChanges = () => {
    setTempExpenses(editableExpenses);
    setIsEditing(false);
  };

  const handleExpenseChange = (field: keyof typeof tempExpenses, value: number) => {
    setTempExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const currentExpenses = isEditing ? tempExpenses : editableExpenses;
  const totalExpenses = 
    currentExpenses.fieldWorkExpenses +
    currentExpenses.productionManagerFieldWork +
    currentExpenses.productionManagerDataEntry +
    currentExpenses.productionManagerBacAudit +
    currentExpenses.fixedSalaries +
    currentExpenses.weeklyExpenses +
    currentExpenses.employeeGratuity +
    currentExpenses.logistics +
    currentExpenses.incentives;

  const categories: (ExpenseCategory & { field: keyof typeof currentExpenses })[] = [
    {
      name: 'Field Staff Salaries',
      amount: currentExpenses.fieldWorkExpenses,
      icon: Users,
      description: `₦56 per name × ${fieldWorkNames} field work names`,
      field: 'fieldWorkExpenses'
    },
    {
      name: 'Production Manager (Field Work)',
      amount: currentExpenses.productionManagerFieldWork,
      icon: Calculator,
      description: `₦20 per name × ${fieldWorkNames} field work names`,
      field: 'productionManagerFieldWork'
    },
    {
      name: 'Production Manager (Data Entry)',
      amount: currentExpenses.productionManagerDataEntry,
      icon: Calculator,
      description: 'Based on data entry names',
      field: 'productionManagerDataEntry'
    },
    {
      name: 'Production Manager (BAC Audit)',
      amount: currentExpenses.productionManagerBacAudit,
      icon: Calculator,
      description: 'Based on BAC audit names',
      field: 'productionManagerBacAudit'
    },
    {
      name: 'Fixed Monthly Salaries',
      amount: currentExpenses.fixedSalaries,
      icon: Building,
      description: 'Supervisors & Admin (prorated)',
      field: 'fixedSalaries'
    },
    {
      name: 'Operations & Utilities',
      amount: currentExpenses.weeklyExpenses,
      icon: Zap,
      description: 'Power, data, support costs',
      field: 'weeklyExpenses'
    },
    {
      name: 'Employee Gratuity',
      amount: currentExpenses.employeeGratuity,
      icon: Gift,
      description: '7.5% of total salaries',
      field: 'employeeGratuity'
    },
    {
      name: 'Logistics',
      amount: currentExpenses.logistics,
      icon: Truck,
      description: '3% of weekly income',
      field: 'logistics'
    },
    {
      name: 'Incentives',
      amount: currentExpenses.incentives,
      icon: Trophy,
      description: '2% of weekly income',
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

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Total Weekly Expenses</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
        </div>
      </div>
    </Card>
  );
};