import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { Loader2, Upload, CheckCircle, FileText, Sparkles, Eye, EyeOff, ChevronRight } from 'lucide-react';

interface ContractUploadDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const ContractUploadDialog: React.FC<ContractUploadDialogProps> = ({
  applicationId, open, onOpenChange, onSaved,
}) => {
  const { toast } = useToast();
  const [contract, setContract]           = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [file, setFile]                   = useState<File | null>(null);
  const [templates, setTemplates]         = useState<any[]>([]);
  // Multiple selected template IDs in order
  const [selectedTpls, setSelectedTpls]   = useState<string[]>([]);
  const [bodyHtml, setBodyHtml]           = useState<string>('');
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [step, setStep]                   = useState<'template' | 'edit'>('template');

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      setStep('template');
      setPreviewOpen(false);
      Promise.all([
        supabase.from('contracts').select('*').eq('application_id', applicationId).maybeSingle(),
        db.from('contract_templates').select('*').eq('is_active', true).order('title'),
      ]).then(([{ data: c }, { data: t }]) => {
        setContract(c);
        const tpls = (t as any[]) || [];
        setTemplates(tpls);
        const existingBody = (c as any)?.body_html || '';
        // Restore previously selected template IDs (stored as array or single)
        const existingTplId = (c as any)?.template_id || '';
        setSelectedTpls(existingTplId ? [existingTplId] : []);
        setBodyHtml(existingBody);
        if (c) setStep('edit');
        setLoading(false);
      });
    }
  }, [open, applicationId]);

  const toggleTemplate = (id: string) => {
    setSelectedTpls(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const handleProceedWithTemplate = () => {
    // Concatenate selected templates in order, separated by a divider
    if (selectedTpls.length > 0) {
      const bodies = selectedTpls
        .map(id => templates.find(t => t.id === id))
        .filter(Boolean)
        .map(t => t.body_html || '');
      setBodyHtml(bodies.join('\n\n---\n\n'));
    }
    setStep('edit');
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
        template_id: selectedTpls[0] || null,
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
            const pos  = (app as any).job_positions?.title || 'the role';
            await supabase.functions.invoke('send-sms', {
              body: { to: prof?.phone || '', user_id: cand.user_id, template_key: 'candidate_offer', vars: { name, position: pos, link: `${window.location.origin}/offers` } },
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Contract Management
          </DialogTitle>
          {/* Step indicator */}
          {!contract && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`font-medium ${step === 'template' ? 'text-primary' : 'text-muted-foreground'}`}>1. Select Template</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className={`font-medium ${step === 'edit' ? 'text-primary' : 'text-muted-foreground'}`}>2. Review & Send</span>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Existing contract status ─────────────────────────────── */}
            {contract && (
              <div className="p-4 rounded-xl bg-muted/40 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Contract Status</span>
                  <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'} className="capitalize">
                    {contract.status}
                  </Badge>
                </div>
                {contract.contract_url && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Document uploaded
                  </p>
                )}
                {contract.signed_at && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Signed on {new Date(contract.signed_at).toLocaleDateString()}
                  </p>
                )}
                {(contract.signature_data || contract.signed_full_name) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Candidate Signature:</p>
                    {contract.signature_data
                      ? <img src={contract.signature_data} alt="Signature" className="border rounded h-16 bg-background" />
                      : <p className="text-sm font-medium italic">{contract.signed_full_name}</p>}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 1: Template picker ──────────────────────────────── */}
            {step === 'template' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Choose contract templates
                  </p>
                  <p className="text-xs text-muted-foreground">Select one or more templates to combine. They will be joined in the order you select them.</p>
                </div>

                {templates.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No templates available</p>
                    <p className="text-xs mt-1">Create contract templates in Admin → Contract Templates, or proceed to write the contract manually.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((t, idx) => {
                      const selected = selectedTpls.includes(t.id);
                      const order    = selectedTpls.indexOf(t.id) + 1;
                      return (
                        <button key={t.id} onClick={() => toggleTemplate(t.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all
                            ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30'}`}>
                          <div className="flex items-center gap-3">
                            {/* Order badge or empty circle */}
                            <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all
                              ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>
                              {selected ? order : ''}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground">{t.title}</p>
                              {t.role_name && <p className="text-xs text-muted-foreground">{t.role_name}</p>}
                              {t.body_html && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.body_html.slice(0, 80)}…</p>}
                            </div>
                            {selected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTpls.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedTpls.length} template{selectedTpls.length > 1 ? 's' : ''} selected</span>
                    {selectedTpls.length > 1 && ' — will be combined in selection order'}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setSelectedTpls([]); setBodyHtml(''); setStep('edit'); }}>
                    Write manually
                  </Button>
                  <Button className="flex-1" onClick={handleProceedWithTemplate} disabled={templates.length > 0 && selectedTpls.length === 0}>
                    {selectedTpls.length > 0 ? `Use ${selectedTpls.length} template${selectedTpls.length > 1 ? 's' : ''} →` : templates.length === 0 ? 'Continue →' : 'Select at least one'}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Edit + send ──────────────────────────────────── */}
            {step === 'edit' && (
              <div className="space-y-4">
                {/* Template badge + change link */}
                {selectedTpls.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {selectedTpls.length === 1
                          ? `Template: ${templates.find(t => t.id === selectedTpls[0])?.title || 'Custom'}`
                          : `${selectedTpls.length} templates combined`}
                      </span>
                    </div>
                    {!contract && (
                      <button className="text-xs text-primary hover:underline shrink-0 ml-2" onClick={() => setStep('template')}>
                        Change
                      </button>
                    )}
                  </div>
                )}

                {/* Contract body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contract Body <span className="text-muted-foreground font-normal">(shown to candidate for signing)</span></Label>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setPreviewOpen(p => !p)}>
                      {previewOpen ? <><EyeOff className="h-3.5 w-3.5" /> Hide preview</> : <><Eye className="h-3.5 w-3.5" /> Preview</>}
                    </Button>
                  </div>
                  {previewOpen ? (
                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto p-4 rounded-lg border bg-background text-sm whitespace-pre-wrap leading-relaxed">
                      {bodyHtml || <span className="text-muted-foreground italic">No content yet</span>}
                    </div>
                  ) : (
                    <Textarea rows={8} value={bodyHtml} onChange={e => setBodyHtml(e.target.value)}
                      placeholder="The full contract text the candidate will read and sign…" className="text-sm" />
                  )}
                </div>

                {/* File upload */}
                <div className="space-y-2">
                  <Label>{contract?.contract_url ? 'Replace contract document (optional)' : 'Attach contract document (optional)'}</Label>
                  <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground">PDF or Word document. If provided, candidate can download it alongside the text above.</p>
                </div>

                <Button onClick={handleSave} disabled={uploading || (!bodyHtml.trim() && !file)} className="w-full">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : <><Upload className="h-4 w-4 mr-2" /> Save & Notify Candidate</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContractUploadDialog;
