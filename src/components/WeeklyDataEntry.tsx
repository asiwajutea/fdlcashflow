import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, Save, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyData {
  week: string;
  fieldWork: number;
  dataEntry: number;
  bacAudit: number;
  metadataAudit: number;
  virtualAudit: number;
  bookletProduction: number;
  rateConfigId?: string;
}

interface RateConfig {
  id: string;
  field_work_rate: number;
  virtual_audit_rate: number;
  data_entry_rate: number;
  bac_audit_rate: number;
  metadata_audit_rate: number;
  booklet_rate: number;
}

interface WeeklyDataEntryProps {
  onDataSubmit: (data: WeeklyData) => void;
  initialData?: WeeklyData;
}

export const WeeklyDataEntry: React.FC<WeeklyDataEntryProps> = ({ 
  onDataSubmit, 
  initialData 
}) => {
  const { toast } = useToast();
  const [rateConfig, setRateConfig] = useState<RateConfig | null>(null);
  const MONTHLY_BOOKLET_INCOME = 65000;
  const WEEKLY_BOOKLET_INCOME = MONTHLY_BOOKLET_INCOME / 4.33;
  
  const [formData, setFormData] = useState<WeeklyData>(
    initialData || {
      week: new Date().toISOString().slice(0, 10),
      fieldWork: 0,
      dataEntry: 0,
      bacAudit: 0,
      metadataAudit: 0,
      virtualAudit: 0,
      bookletProduction: Math.round(WEEKLY_BOOKLET_INCOME),
    }
  );

  useEffect(() => {
    fetchCurrentRates();
  }, []);

  const fetchCurrentRates = async () => {
    try {
      const { data, error } = await supabase
        .from("rate_configurations")
        .select("*")
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setRateConfig(data);
    } catch (error) {
      console.error("Error fetching rates:", error);
      // Use default rates if fetch fails
      setRateConfig({
        id: '',
        field_work_rate: 90,
        virtual_audit_rate: 0,
        data_entry_rate: 0,
        bac_audit_rate: 0,
        metadata_audit_rate: 0,
        booklet_rate: 0,
      });
    }
  };

  const handleInputChange = (field: keyof WeeklyData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'week' ? value : Number(value) || 0
    }));
  };

  const calculateIncome = () => {
    if (!rateConfig) return 0;

    return (
      formData.fieldWork * rateConfig.field_work_rate +
      formData.dataEntry * rateConfig.data_entry_rate +
      formData.bacAudit * rateConfig.bac_audit_rate +
      formData.metadataAudit * rateConfig.metadata_audit_rate +
      formData.virtualAudit * rateConfig.virtual_audit_rate +
      formData.bookletProduction
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDataSubmit({
      ...formData,
      rateConfigId: rateConfig?.id,
    });
    toast({
      title: "Weekly Data Saved",
      description: `Data for week ${formData.week} has been successfully saved.`,
    });
  };

  const totalIncome = calculateIncome();

  return (
    <Card className="financial-card">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Weekly Data Entry</h2>
            <p className="text-sm text-muted-foreground">Enter genealogy project data</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Week Selection */}
          <div>
            <Label htmlFor="week" className="text-sm font-medium text-foreground mb-2 block">
              Week Starting Date
            </Label>
            <Input
              id="week"
              type="date"
              value={formData.week}
              onChange={(e) => handleInputChange('week', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Data Entry Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fieldWork" className="text-sm font-medium text-foreground mb-2 block">
                Field Work Names
              </Label>
              <Input
                id="fieldWork"
                type="number"
                min="0"
                value={formData.fieldWork}
                onChange={(e) => handleInputChange('fieldWork', e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">₦{rateConfig?.field_work_rate || 90} per name</p>
            </div>

            <div>
              <Label htmlFor="dataEntry" className="text-sm font-medium text-foreground mb-2 block">
                Data Entry Names
              </Label>
              <Input
                id="dataEntry"
                type="number"
                min="0"
                value={formData.dataEntry}
                onChange={(e) => handleInputChange('dataEntry', e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">₦{rateConfig?.data_entry_rate || 0} per name</p>
            </div>

            <div>
              <Label htmlFor="bacAudit" className="text-sm font-medium text-foreground mb-2 block">
                BAC Audit Names
              </Label>
              <Input
                id="bacAudit"
                type="number"
                min="0"
                value={formData.bacAudit}
                onChange={(e) => handleInputChange('bacAudit', e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">₦{rateConfig?.bac_audit_rate || 0} per name</p>
            </div>

            <div>
              <Label htmlFor="metadataAudit" className="text-sm font-medium text-foreground mb-2 block">
                Metadata Audit Names
              </Label>
              <Input
                id="metadataAudit"
                type="number"
                min="0"
                value={formData.metadataAudit}
                onChange={(e) => handleInputChange('metadataAudit', e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">₦{rateConfig?.metadata_audit_rate || 0} per name</p>
            </div>

            <div>
              <Label htmlFor="virtualAudit" className="text-sm font-medium text-foreground mb-2 block">
                Virtual Audit Names
              </Label>
              <Input
                id="virtualAudit"
                type="number"
                min="0"
                value={formData.virtualAudit}
                onChange={(e) => handleInputChange('virtualAudit', e.target.value)}
                className="w-full"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">₦{rateConfig?.virtual_audit_rate || 0} per name</p>
            </div>

            <div>
              <Label htmlFor="bookletProduction" className="text-sm font-medium text-foreground mb-2 block">
                Booklet Production (Weekly)
              </Label>
              <Input
                id="bookletProduction"
                type="number"
                min="0"
                value={formData.bookletProduction}
                onChange={(e) => handleInputChange('bookletProduction', e.target.value)}
                className="w-full"
                placeholder="15011"
              />
              <p className="text-xs text-muted-foreground mt-1">Fixed income (₦65,000/month prorated)</p>
            </div>
          </div>

          {/* Income Preview */}
          <div className="bg-success-background border border-success/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="h-4 w-4 text-success" />
              <h3 className="font-medium text-success-foreground">Projected Weekly Income</h3>
            </div>
            <p className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                minimumFractionDigits: 0,
              }).format(totalIncome)}
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:bg-primary-dark transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Weekly Data
          </Button>
        </form>
      </div>
    </Card>
  );
};