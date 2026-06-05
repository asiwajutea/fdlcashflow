import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save } from 'lucide-react';
import { RateItemsManager } from './RateItemsManager';

interface RateConfig {
  id: string;
  // Income rates (per name)
  field_work_rate: number;
  data_entry_rate: number;
  bac_audit_rate: number;
  metadata_audit_rate: number;
  virtual_audit_rate: number;

  // Fixed income (monthly)
  booklet_monthly_income: number;

  // Field Staff Salaries (per name)
  field_agent_rate: number;
  field_manager_rate: number;
  booking_agent_rate: number;
  field_relation_rate: number;
  field_misc_rate: number;

  // Data Entry (per name)
  data_entry_clerks_rate: number;
  qa_manager_rate: number;
  data_entry_misc_rate: number;

  // Production Manager (per name)
  pm_field_work_rate: number;
  pm_data_entry_rate: number;
  pm_bac_audit_rate: number;

  // Fixed Monthly Salaries
  field_relation_supervisor_salary: number;
  administrative_assistant_salary: number;
  field_relation_officers_salary: number;

  // Recurring Monthly Costs
  power_plant_monthly: number;
  office_data_subscription_monthly: number;
  staff_data_support_monthly: number;

  // Percentage-Based
  employee_gratuity_rate: number;
  logistics_rate: number;
  incentives_rate: number;
}
export const RateSettings = () => {
  const {
    toast
  } = useToast();
  const [rates, setRates] = useState<RateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchCurrentRates();
  }, []);
  const fetchCurrentRates = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('rate_configurations').select('*').order('effective_from', {
        ascending: false
      }).limit(1).single();
      if (error) throw error;
      setRates(data as RateConfig);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: "Error",
        description: "Failed to load rate configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!rates) return;
    setSaving(true);
    try {
      // Get previous config for history
      const {
        data: previousConfig
      } = await supabase.from('rate_configurations').select('*').order('effective_from', {
        ascending: false
      }).limit(1).single();

      // Create a new rate configuration (preserves history)
      const {
        id: _,
        ...ratesWithoutId
      } = rates;
      const formData = {
        ...ratesWithoutId,
        effective_from: new Date().toISOString()
      };
      const {
        data: newConfig,
        error
      } = await supabase.from('rate_configurations').insert(formData).select().single();
      if (error) throw error;

      // Create detailed change summary
      const changes: string[] = [];
      if (previousConfig) {
        Object.keys(rates).forEach(key => {
          if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'effective_from') {
            const oldValue = previousConfig[key];
            const newValue = rates[key as keyof RateConfig];
            if (oldValue !== newValue) {
              changes.push(`${key}: ₦${oldValue} → ₦${newValue}`);
            }
          }
        });
      }

      // Record the rate change in history with all rate details
      if (newConfig) {
        await supabase.from('rate_change_history').insert({
          rate_config_id: newConfig.id,
          change_summary: changes.length > 0 ? `Updated ${changes.length} rate(s)` : 'Initial rate configuration',
          previous_config: previousConfig,
          new_config: newConfig
        });
      }
      toast({
        title: "Success",
        description: "Rate configuration saved. New entries will use these rates."
      });

      // Refresh to get the new record with ID
      await fetchCurrentRates();
    } catch (error) {
      console.error('Error saving rates:', error);
      toast({
        title: "Error",
        description: "Failed to save rate configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const updateRate = (field: keyof RateConfig, value: number) => {
    if (rates) {
      setRates({
        ...rates,
        [field]: value
      });
    }
  };
  if (loading) {
    return <Card className="financial-card p-8">
        <p className="text-muted-foreground">Loading rate configuration...</p>
      </Card>;
  }
  if (!rates) return null;
  return <Card className="financial-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Rate Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Changes only affect future calculations. History is preserved.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-8">
        {/* Admin-managed custom rate labels */}
        <RateItemsManager />

        <Separator />


        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Income - Pay Per Name</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="field_work_rate">Field Work</Label>
              <Input id="field_work_rate" type="number" value={rates.field_work_rate} onChange={e => updateRate('field_work_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_work_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="data_entry_rate">Data Entry</Label>
              <Input id="data_entry_rate" type="number" value={rates.data_entry_rate} onChange={e => updateRate('data_entry_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.data_entry_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="bac_audit_rate">BAC Audit</Label>
              <Input id="bac_audit_rate" type="number" value={rates.bac_audit_rate} onChange={e => updateRate('bac_audit_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.bac_audit_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="metadata_audit_rate">Metadata Audit</Label>
              <Input id="metadata_audit_rate" type="number" value={rates.metadata_audit_rate} onChange={e => updateRate('metadata_audit_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.metadata_audit_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="virtual_audit_rate">Virtual Audit</Label>
              <Input id="virtual_audit_rate" type="number" value={rates.virtual_audit_rate} onChange={e => updateRate('virtual_audit_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.virtual_audit_rate} per name</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Fixed Income */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Income - Fixed Monthly</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booklet_monthly_income">Booklet Production</Label>
              <Input id="booklet_monthly_income" type="number" value={rates.booklet_monthly_income} onChange={e => updateRate('booklet_monthly_income', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.booklet_monthly_income.toLocaleString()} per month</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Field Staff Salaries */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Field Staff Salaries (Per Name)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="field_agent_rate">Field Agent</Label>
              <Input id="field_agent_rate" type="number" value={rates.field_agent_rate} onChange={e => updateRate('field_agent_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_agent_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="field_manager_rate">Field Manager</Label>
              <Input id="field_manager_rate" type="number" value={rates.field_manager_rate} onChange={e => updateRate('field_manager_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_manager_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="booking_agent_rate">Booking Agent</Label>
              <Input id="booking_agent_rate" type="number" value={rates.booking_agent_rate} onChange={e => updateRate('booking_agent_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.booking_agent_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="field_relation_rate">Field Relation</Label>
              <Input id="field_relation_rate" type="number" value={rates.field_relation_rate} onChange={e => updateRate('field_relation_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_relation_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="field_misc_rate">Field Miscellaneous</Label>
              <Input id="field_misc_rate" type="number" value={rates.field_misc_rate} onChange={e => updateRate('field_misc_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_misc_rate} per name</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Total Field Staff: ₦{rates.field_agent_rate + rates.field_manager_rate + rates.booking_agent_rate + rates.field_relation_rate + rates.field_misc_rate} per name
          </p>
        </section>

        <Separator />

        {/* Data Entry */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Data Entry (Per Name)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="data_entry_clerks_rate">Data Entry Clerks</Label>
              <Input id="data_entry_clerks_rate" type="number" value={rates.data_entry_clerks_rate} onChange={e => updateRate('data_entry_clerks_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.data_entry_clerks_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="qa_manager_rate">QA Manager</Label>
              <Input id="qa_manager_rate" type="number" value={rates.qa_manager_rate} onChange={e => updateRate('qa_manager_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.qa_manager_rate} per name</p>
            </div>
            <div>
              <Label htmlFor="data_entry_misc_rate">Miscellaneous</Label>
              <Input id="data_entry_misc_rate" type="number" value={rates.data_entry_misc_rate} onChange={e => updateRate('data_entry_misc_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.data_entry_misc_rate} per name</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Total Data Entry: ₦{rates.data_entry_clerks_rate + rates.qa_manager_rate + rates.data_entry_misc_rate} per name
          </p>
        </section>

        <Separator />

        {/* Production Manager */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Production Manager (Per Name)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pm_field_work_rate">PM Field Work</Label>
              <Input id="pm_field_work_rate" type="number" value={rates.pm_field_work_rate} onChange={e => updateRate('pm_field_work_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.pm_field_work_rate} per field work name</p>
            </div>
            <div>
              <Label htmlFor="pm_data_entry_rate">PM Data Entry</Label>
              <Input id="pm_data_entry_rate" type="number" value={rates.pm_data_entry_rate} onChange={e => updateRate('pm_data_entry_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.pm_data_entry_rate} per data entry name</p>
            </div>
            <div>
              <Label htmlFor="pm_bac_audit_rate">PM BAC Audit</Label>
              <Input id="pm_bac_audit_rate" type="number" value={rates.pm_bac_audit_rate} onChange={e => updateRate('pm_bac_audit_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.pm_bac_audit_rate} per BAC audit name</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Fixed Monthly Salaries */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Fixed Monthly Salaries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="field_relation_supervisor_salary">Field Relation Supervisor</Label>
              <Input id="field_relation_supervisor_salary" type="number" value={rates.field_relation_supervisor_salary} onChange={e => updateRate('field_relation_supervisor_salary', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_relation_supervisor_salary.toLocaleString()} per month</p>
            </div>
            <div>
              <Label htmlFor="administrative_assistant_salary">Administrative Assistant</Label>
              <Input id="administrative_assistant_salary" type="number" value={rates.administrative_assistant_salary} onChange={e => updateRate('administrative_assistant_salary', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.administrative_assistant_salary.toLocaleString()} per month</p>
            </div>
            <div>
              <Label htmlFor="field_relation_officers_salary">Field Relation Officers</Label>
              <Input id="field_relation_officers_salary" type="number" value={rates.field_relation_officers_salary} onChange={e => updateRate('field_relation_officers_salary', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.field_relation_officers_salary.toLocaleString()} per month</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Total Fixed Salaries: ₦{(rates.field_relation_supervisor_salary + rates.administrative_assistant_salary + rates.field_relation_officers_salary).toLocaleString()} per month
          </p>
        </section>

        <Separator />

        {/* Recurring Monthly Costs */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Recurring Monthly Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="power_plant_monthly">Power Plant</Label>
              <Input id="power_plant_monthly" type="number" value={rates.power_plant_monthly} onChange={e => updateRate('power_plant_monthly', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.power_plant_monthly.toLocaleString()} per month</p>
            </div>
            <div>
              <Label htmlFor="office_data_subscription_monthly">Office Data Subscription</Label>
              <Input id="office_data_subscription_monthly" type="number" value={rates.office_data_subscription_monthly} onChange={e => updateRate('office_data_subscription_monthly', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.office_data_subscription_monthly.toLocaleString()} per month</p>
            </div>
            <div>
              <Label htmlFor="staff_data_support_monthly">Staff Data Support</Label>
              <Input id="staff_data_support_monthly" type="number" value={rates.staff_data_support_monthly} onChange={e => updateRate('staff_data_support_monthly', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">₦{rates.staff_data_support_monthly.toLocaleString()} per month</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Total Operating Expenditure: ₦{(rates.power_plant_monthly + rates.office_data_subscription_monthly + rates.staff_data_support_monthly).toLocaleString()} per month
          </p>
        </section>

        <Separator />

        {/* Percentage-Based */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-600">Expenses - Percentage-Based</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employee_gratuity_rate">Employee Gratuity Fund</Label>
              <Input id="employee_gratuity_rate" type="number" step="0.001" value={rates.employee_gratuity_rate} onChange={e => updateRate('employee_gratuity_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{(rates.employee_gratuity_rate * 100).toFixed(2)}% of salaries</p>
            </div>
            <div>
              <Label htmlFor="logistics_rate">Logistics</Label>
              <Input id="logistics_rate" type="number" step="0.001" value={rates.logistics_rate} onChange={e => updateRate('logistics_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{(rates.logistics_rate * 100).toFixed(2)}% of monthly income</p>
            </div>
            <div>
              <Label htmlFor="incentives_rate">Incentives & Events</Label>
              <Input id="incentives_rate" type="number" step="0.001" value={rates.incentives_rate} onChange={e => updateRate('incentives_rate', Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{(rates.incentives_rate * 100).toFixed(2)}% of monthly income</p>
            </div>
          </div>
        </section>
      </div>
    </Card>;
};