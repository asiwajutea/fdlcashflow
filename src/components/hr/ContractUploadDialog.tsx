import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { Loader2, Upload, CheckCircle, FileText, Sparkles } from 'lucide-react';

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
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      Promise.all([
        supabase.from('contracts').select('*').eq('application_id', applicationId).maybeSingle(),
        db.from('contract_templates').select('*').eq('is_active', true).order('title'),
      ]).then(([{ data: c }, { data: t }]) => {
        setContract(c);
        setTemplates((t as any[]) || []);
        setBodyHtml((c as any)?.body_html || '');
        setSelectedTpl((c as any)?.template_id || '');
        setLoading(false);
      });
    }
  }, [open, applicationId]);

  const applyTemplate = (id: string) => {
    setSelectedTpl(id);
    const t = templates.find((x) => x.id === id);
    if (t) setBodyHtml(t.body_html || '');
  };

  const handleSave = async () => {
    if (!applicationId) return;
    setUploading(true);
    try {
      let filePath = contract?.contract_url || '';
      if (file) {
        const fp = `${applicationId}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fp, file, { upsert: true });
        if (uploadError) throw uploadError;
        filePath = fp;
      }

      const payload: any = {
        application_id: applicationId,
        contract_url: filePath,
        status: 'pending',
        template_id: selectedTpl || null,
        body_html: bodyHtml,
      };

      if (contract) {
        await db.from('contracts').update(payload).eq('id', contract.id);
      } else {
        await db.from('contracts').insert(payload);
      }

      // Notify candidate via SMS + inbox
      try {
        const { data: app } = await db.from('applications').select('candidate_id, job_positions!inner(title)').eq('id', applicationId).maybeSingle();
        if (app?.candidate_id) {
          const { data: cand } = await db.from('candidates').select('user_id').eq('id', app.candidate_id).maybeSingle();
          if (cand?.user_id) {
            const { data: prof } = await db.from('profiles').select('full_name, phone').eq('id', cand.user_id).maybeSingle();
            const name = (prof?.full_name || 'there').split(' ')[0];
            const pos = (app as any).job_positions?.title || 'the role';
            await supabase.functions.invoke('send-sms', {
              body: {
                to: prof?.phone || '',
                user_id: cand.user_id,
                template_key: 'candidate_offer',
                vars: { name, position: pos, link: `${window.location.origin}/offers` },
              },
            });
          }
        }
      } catch (e) { console.error('offer sms', e); }

      toast({ title: 'Contract Saved', description: 'Contract has been assigned to the candidate.' });
      setFile(null);
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Save Error', description: e.message || 'Failed to save contract', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                {(contract.signature_data || contract.signed_full_name) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Candidate Signature:</p>
                    {contract.signature_data ? (
                      <img src={contract.signature_data} alt="Signature" className="border rounded h-16 bg-background" />
                    ) : (
                      <p className="text-sm font-medium italic">{contract.signed_full_name}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Use a template</Label>
                <Select value={selectedTpl} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="Pick template…" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Contract body (shown to candidate)</Label>
              <Textarea rows={6} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="Paste or edit the contract text the candidate will sign…" />
            </div>

            <div className="space-y-2">
              <Label>{contract?.contract_url ? 'Replace contract document (optional)' : 'Upload contract document (optional)'}</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={handleSave} disabled={uploading} className="w-full">
              {uploading ? (<Loader2 className="h-4 w-4 animate-spin mr-2" />) : (<Upload className="h-4 w-4 mr-2" />)}
              Save & Notify Candidate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContractUploadDialog;
