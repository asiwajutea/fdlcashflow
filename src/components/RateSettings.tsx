import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
interface RateConfig {
  id: string;
  field_work_rate: number;
  virtual_audit_rate: number;
  data_entry_rate: number;
  bac_audit_rate: number;
  metadata_audit_rate: number;
  booklet_rate: number;
  production_manager_salary: number;
  fixed_monthly_salaries: number;
  operations_utilities: number;
  employee_gratuity: number;
  logistics: number;
  incentives: number;
  effective_from: string;
}
export function RateSettings() {
  const [rates, setRates] = useState<RateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchCurrentRates();
  }, []);
  const fetchCurrentRates = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("rate_configurations").select("*").order("effective_from", {
        ascending: false
      }).limit(1).single();
      if (error) throw error;
      setRates(data);
    } catch (error) {
      console.error("Error fetching rates:", error);
      toast({
        title: "Error",
        description: "Failed to load rate configurations",
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
      // Create a new rate configuration (for history tracking)
      const {
        error
      } = await supabase.from("rate_configurations").insert({
        field_work_rate: rates.field_work_rate,
        virtual_audit_rate: rates.virtual_audit_rate,
        data_entry_rate: rates.data_entry_rate,
        bac_audit_rate: rates.bac_audit_rate,
        metadata_audit_rate: rates.metadata_audit_rate,
        booklet_rate: rates.booklet_rate,
        production_manager_salary: rates.production_manager_salary,
        fixed_monthly_salaries: rates.fixed_monthly_salaries,
        operations_utilities: rates.operations_utilities,
        employee_gratuity: rates.employee_gratuity,
        logistics: rates.logistics,
        incentives: rates.incentives
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Rate configuration updated. Changes will apply to future records."
      });

      // Refresh to get the new config
      await fetchCurrentRates();
    } catch (error) {
      console.error("Error saving rates:", error);
      toast({
        title: "Error",
        description: "Failed to save rate configurations",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const updateRate = (field: keyof RateConfig, value: string) => {
    if (!rates) return;
    setRates({
      ...rates,
      [field]: parseFloat(value) || 0
    });
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  if (!rates) {
    return <div className="text-center p-8">
        <p>No rate configuration found</p>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rate Configuration</h2>
          <p className="text-muted-foreground">
            Adjust payment rates and fixed expenses. Changes only affect future calculations.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </> : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Variable Income Rates</CardTitle>
            <CardDescription>Payment per unit for income categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field_work_rate">Field Work (per name)</Label>
              <Input id="field_work_rate" type="number" value={rates.field_work_rate} onChange={e => updateRate("field_work_rate", e.target.value)} placeholder="90" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="virtual_audit_rate">Virtual Audit (per name)</Label>
              <Input id="virtual_audit_rate" type="number" value={rates.virtual_audit_rate} onChange={e => updateRate("virtual_audit_rate", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_entry_rate">Data Entry (per name)</Label>
              <Input id="data_entry_rate" type="number" value={rates.data_entry_rate} onChange={e => updateRate("data_entry_rate", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bac_audit_rate">BAC Audit (per name)</Label>
              <Input id="bac_audit_rate" type="number" value={rates.bac_audit_rate} onChange={e => updateRate("bac_audit_rate", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metadata_audit_rate">Metadata Audit (per name)</Label>
              <Input id="metadata_audit_rate" type="number" value={rates.metadata_audit_rate} onChange={e => updateRate("metadata_audit_rate", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booklet_rate">Booklet Income (per month)</Label>
              <Input id="booklet_rate" type="number" value={rates.booklet_rate} onChange={e => updateRate("booklet_rate", e.target.value)} placeholder="0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fixed Monthly Expenses</CardTitle>
            <CardDescription>Fixed costs that occur every month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="production_manager_salary">Production Manager Salary</Label>
              <Input id="production_manager_salary" type="number" value={rates.production_manager_salary} onChange={e => updateRate("production_manager_salary", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed_monthly_salaries">Fixed Monthly Salaries</Label>
              <Input id="fixed_monthly_salaries" type="number" value={rates.fixed_monthly_salaries} onChange={e => updateRate("fixed_monthly_salaries", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operations_utilities">Operations & Utilities (%)</Label>
              <Input id="operations_utilities" type="number" value={rates.operations_utilities} onChange={e => updateRate("operations_utilities", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_gratuity">Employee Gratuity (%)</Label>
              <Input id="employee_gratuity" type="number" value={rates.employee_gratuity} onChange={e => updateRate("employee_gratuity", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logistics">Logistics %</Label>
              <Input id="logistics" type="number" value={rates.logistics} onChange={e => updateRate("logistics", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incentives">Incentives (%)</Label>
              <Input id="incentives" type="number" value={rates.incentives} onChange={e => updateRate("incentives", e.target.value)} placeholder="0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}