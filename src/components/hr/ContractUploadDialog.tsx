import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, CheckCircle, FileText } from 'lucide-react';

interface ContractUploadDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const ContractUploadDialog: React.FC<ContractUploadDialogProps> = ({
  applicationId,
  open,
  onOpenChange,
  onSaved,
}) => {
  const { toast } = useToast();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      supabase
        .from('contracts')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle()
        .then(({ data: d }) => {
          setContract(d);
          setLoading(false);
        });
    }
  }, [open, applicationId]);

  const handleUpload = async () => {
    if (!file || !applicationId) return;
    setUploading(true);

    try {
      const filePath = `${applicationId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (contract) {
        await supabase
          .from('contracts')
          .update({ contract_url: filePath })
          .eq('id', contract.id);
      } else {
        await supabase.from('contracts').insert({
          application_id: applicationId,
          contract_url: filePath,
          status: 'pending',
        });
      }

      toast({ title: 'Contract Uploaded', description: 'Contract document has been uploaded successfully.' });
      setFile(null);
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Upload Error', description: e.message || 'Failed to upload contract', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contract Management</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            {contract && (
              <div className="p-3 rounded-md bg-muted space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
                    {contract.status}
                  </Badge>
                </div>
                {contract.contract_url && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Contract document uploaded
                  </p>
                )}
                {contract.signed_at && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Signed on{' '}
                    {new Date(contract.signed_at).toLocaleDateString()}
                  </p>
                )}
                {contract.signature_data && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Candidate Signature:</p>
                    <img src={contract.signature_data} alt="Signature" className="border rounded h-16 bg-background" />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{contract ? 'Replace Contract Document' : 'Upload Contract Document'}</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Contract
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContractUploadDialog;
