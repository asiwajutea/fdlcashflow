import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditWeeklyRecordDialogProps {
  record: {
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
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditWeeklyRecordDialog: React.FC<EditWeeklyRecordDialogProps> = ({
  record,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    field_work: 0,
    data_entry: 0,
    bac_audit: 0,
    metadata_audit: 0,
    virtual_audit: 0,
    booklet_income: 0,
    total_income: 0,
    total_expenses: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        field_work: record.field_work,
        data_entry: record.data_entry,
        bac_audit: record.bac_audit,
        metadata_audit: record.metadata_audit,
        virtual_audit: record.virtual_audit,
        booklet_income: record.booklet_income,
        total_income: record.total_income,
        total_expenses: record.total_expenses,
      });
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;

    setSaving(true);
    try {
      const net_cashflow = formData.total_income - formData.total_expenses;

      const { error } = await supabase
        .from('weekly_records')
        .update({
          field_work: formData.field_work,
          data_entry: formData.data_entry,
          bac_audit: formData.bac_audit,
          metadata_audit: formData.metadata_audit,
          virtual_audit: formData.virtual_audit,
          booklet_income: formData.booklet_income,
          total_income: formData.total_income,
          total_expenses: formData.total_expenses,
          net_cashflow: net_cashflow,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Weekly record updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update record",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Week {record.week_number}, {record.year}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field_work">Field Work</Label>
            <Input
              id="field_work"
              type="number"
              value={formData.field_work}
              onChange={(e) => setFormData({ ...formData, field_work: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_entry">Data Entry</Label>
            <Input
              id="data_entry"
              type="number"
              value={formData.data_entry}
              onChange={(e) => setFormData({ ...formData, data_entry: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bac_audit">BAC Audit</Label>
            <Input
              id="bac_audit"
              type="number"
              value={formData.bac_audit}
              onChange={(e) => setFormData({ ...formData, bac_audit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata_audit">Metadata Audit</Label>
            <Input
              id="metadata_audit"
              type="number"
              value={formData.metadata_audit}
              onChange={(e) => setFormData({ ...formData, metadata_audit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="virtual_audit">Virtual Audit</Label>
            <Input
              id="virtual_audit"
              type="number"
              value={formData.virtual_audit}
              onChange={(e) => setFormData({ ...formData, virtual_audit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booklet_income">Booklet Income</Label>
            <Input
              id="booklet_income"
              type="number"
              step="0.01"
              value={formData.booklet_income}
              onChange={(e) => setFormData({ ...formData, booklet_income: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_income">Total Income</Label>
            <Input
              id="total_income"
              type="number"
              step="0.01"
              value={formData.total_income}
              onChange={(e) => setFormData({ ...formData, total_income: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_expenses">Total Expenses</Label>
            <Input
              id="total_expenses"
              type="number"
              step="0.01"
              value={formData.total_expenses}
              onChange={(e) => setFormData({ ...formData, total_expenses: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="col-span-2 p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Net Cashflow:</span>
              <span className={`text-lg font-bold ${(formData.total_income - formData.total_expenses) >= 0 ? 'text-success' : 'text-danger'}`}>
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                  minimumFractionDigits: 0,
                }).format(formData.total_income - formData.total_expenses)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
