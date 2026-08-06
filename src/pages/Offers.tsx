import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SignatureCanvas from '@/components/SignatureCanvas';
import ContractRenderer from '@/components/ContractRenderer';
import {
  FileText, CheckCircle, Loader2, PenTool, Type,
  Download, XCircle, MessageSquare, AlertCircle, Info,
} from 'lucide-react';

// ─── placeholder interpolation ───────────────────────────────────────────────

function interpolate(html: string, vars: Record<string, string>): string {
  if (!html) return html;
  return html.replace(/\{\{\s*(\w+)\s*\}\}/gi, (_, key) => {
    const val = vars[key.toLowerCase()];
    return val !== undefined ? val : `{{${key}}}`;
  });
}

// ─── constants ────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  'Salary does not meet my expectations',
  'Role responsibilities do not match what was discussed',
  'I have accepted another offer',
  'The contract terms are not acceptable',
  'Relocation requirements are not feasible',
  'Personal circumstances have changed',
  'Other (please specify below)',
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  pending:                { label: 'Pending your review',       variant: 'secondary',    color: 'text-amber-600' },
  signed:                 { label: 'Signed',                    variant: 'default',      color: 'text-green-600' },
  rejected:               { label: 'Rejected',                  variant: 'destructive',  color: 'text-red-600' },
  negotiating:            { label: 'Negotiation requested',     variant: 'outline',      color: 'text-blue-600' },
  negotiation_accepted:   { label: 'Negotiation accepted — new offer coming', variant: 'outline', color: 'text-emerald-600' },
  negotiation_rejected:   { label: 'Negotiation declined by HR', variant: 'secondary',   color: 'text-orange-600' },
  cancelled:              { label: 'Offer cancelled',           variant: 'destructive',  color: 'text-red-600' },
};

const pdfHref = (p: string) =>
  p?.startsWith('http') ? p
  : p ? `https://uppixbfndhlyfeyjoxrg.supabase.co/storage/v1/object/public/documents/${p}`
  : '';

// ─── main component ───────────────────────────────────────────────────────────

const Offers = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { user, fullName, loading: authLoading } = useAuth();

  const [contracts,   setContracts]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [profileVars, setProfileVars] = useState<Record<string, string>>({});

  // signing
  const [signingId,   setSigningId]   = useState<string | null>(null);
  const [signMode,    setSignMode]    = useState<'draw' | 'type'>('draw');
  const [signature,   setSignature]   = useState<string | null>(null);
  const [typedName,   setTypedName]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  // reject dialog
  const [rejectId,         setRejectId]         = useState<string | null>(null);
  const [rejectReason,     setRejectReason]     = useState('');
  const [rejectCustom,     setRejectCustom]     = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // negotiate dialog
  const [negotiateId,         setNegotiateId]         = useState<string | null>(null);
  const [negotiateNote,       setNegotiateNote]       = useState('');
  const [negotiateSubmitting, setNegotiateSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    // Load candidate's profile for placeholder interpolation
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, employee_id, employment_start_date, phone, position_id, department_id')
      .eq('id', user!.id)
      .maybeSingle();

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const fullN  = (prof as any)?.full_name || fullName || '';
    const firstName = fullN.split(' ')[0] || '';

    setProfileVars({
      name:         fullN,
      full_name:    fullN,
      employee:     fullN,
      first_name:   firstName,
      employee_id:  (prof as any)?.employee_id  || '',
      phone:        (prof as any)?.phone         || '',
      date:         today,
      today:        today,
      today_date:   today,   // alias for {{today_date}}
      company:      'Footprints Dynasty Ltd',
      start_date:   (prof as any)?.employment_start_date
        ? new Date((prof as any).employment_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
    });

    const { data: candidate } = await supabase
      .from('candidates').select('id')
      .eq('user_id', user!.id).maybeSingle();
    if (!candidate) { setLoading(false); return; }

    const { data: apps } = await supabase
      .from('applications')
      .select('id, job_positions!inner(title, department)')
      .eq('candidate_id', candidate.id);
    if (!apps?.length) { setLoading(false); return; }

    const appIds = apps.map(a => a.id);
    const { data: contractData } = await supabase
      .from('contracts')
      .select(`
        *,
        contract_templates(id, title, body_html, header_html, footer_html, pdf_url,
          margin_top, margin_bottom, margin_left, margin_right)
      `)
      .in('application_id', appIds)
      .order('created_at', { ascending: false });

    const appMap = new Map(apps.map(a => [a.id, (a as any).job_positions]));
    setContracts((contractData || []).map(c => ({ ...c, job: appMap.get(c.application_id) })));
    setLoading(false);
  };

  // ── Sign ──────────────────────────────────────────────────────────────────
  const handleSign = async (contractId: string) => {
    if (signMode === 'draw' && !signature) {
      toast({ title: 'Signature required', variant: 'destructive' }); return;
    }
    if (signMode === 'type' && !typedName.trim()) {
      toast({ title: 'Please type your full legal name', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const payload: any = { signed_at: new Date().toISOString(), status: 'signed' };
    if (signMode === 'draw') payload.signature_data   = signature;
    else                     payload.signed_full_name = typedName.trim();
    const { error } = await supabase.from('contracts').update(payload).eq('id', contractId);
    setSubmitting(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contract Signed!', description: 'Your signed contract is on record.' });
    setSigningId(null); setSignature(null); setTypedName('');
    fetchContracts();
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    const reason = rejectReason === 'Other (please specify below)'
      ? rejectCustom.trim()
      : rejectReason;
    if (!reason) {
      toast({ title: 'Please select or write a reason', variant: 'destructive' }); return;
    }
    setRejectSubmitting(true);
    const { error } = await supabase.from('contracts').update({
      status:               'rejected',
      candidate_action:     'rejected',
      candidate_reason:     reason,
      candidate_actioned_at: new Date().toISOString(),
    }).eq('id', rejectId!);
    setRejectSubmitting(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Offer rejected', description: 'HR has been notified of your decision.' });
    setRejectId(null); setRejectReason(''); setRejectCustom('');
    fetchContracts();
  };

  // ── Negotiate ─────────────────────────────────────────────────────────────
  const handleNegotiate = async () => {
    if (!negotiateNote.trim()) {
      toast({ title: 'Please describe what you would like to negotiate', variant: 'destructive' }); return;
    }
    setNegotiateSubmitting(true);
    const { error } = await supabase.from('contracts').update({
      status:               'negotiating',
      candidate_action:     'negotiating',
      candidate_reason:     negotiateNote.trim(),
      candidate_actioned_at: new Date().toISOString(),
    }).eq('id', negotiateId!);
    setNegotiateSubmitting(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Negotiation request sent', description: 'HR will review and respond to your request.' });
    setNegotiateId(null); setNegotiateNote('');
    fetchContracts();
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Offers">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Offers & Contracts">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> My Contracts
        </h2>

        {contracts.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Contracts Yet</h3>
            <p className="text-muted-foreground">Contracts will appear here when you receive an offer.</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {contracts.map((contract) => {
      const tpl        = contract.contract_templates;
              const rawBody    = contract.body_html  || tpl?.body_html   || '';
              const rawHeader  = tpl?.header_html    || '';
              const rawFooter  = tpl?.footer_html    || '';
              // Build vars — contract start_date takes priority over profile value
              const contractStartDate = contract.start_date
                ? new Date(contract.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : profileVars.start_date || '';
              const vars = { ...profileVars, start_date: contractStartDate };
              // Replace {{placeholders}} with the candidate's actual data
              const bodyHtml   = interpolate(rawBody,   vars);
              const headerHtml = interpolate(rawHeader, vars);
              const footerHtml = interpolate(rawFooter, vars);
              const margins    = tpl ? { top: tpl.margin_top ?? 56, bottom: tpl.margin_bottom ?? 56, left: tpl.margin_left ?? 64, right: tpl.margin_right ?? 64 } : undefined;
              const hasPdf     = contract.contract_url || tpl?.pdf_url;
              const statusCfg  = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.pending;
              const isPending  = contract.status === 'pending';
              const isSigned   = contract.status === 'signed';
              const isNegotiating = contract.status === 'negotiating';
              const negRejected = contract.status === 'negotiation_rejected';

              return (
                <Card key={contract.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                      <span>{contract.job?.title || tpl?.title || 'Employment Contract'}</span>
                      <div className="flex items-center gap-2">
                        {hasPdf && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={pdfHref(contract.contract_url || tpl?.pdf_url)} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5 mr-1" /> PDF
                            </a>
                          </Button>
                        )}
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-5">

                    {/* HR note — always visible when set */}
                    {contract.hr_note && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 p-4 space-y-1">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" /> Note from HR
                        </p>
                        <p className="text-sm text-foreground">{contract.hr_note}</p>
                      </div>
                    )}

                    {/* Candidate's own action note */}
                    {contract.candidate_reason && (
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Your {contract.candidate_action === 'negotiating' ? 'negotiation request' : 'reason for rejection'}:</p>
                        <p className="text-sm text-foreground">{contract.candidate_reason}</p>
                      </div>
                    )}

                    {/* Contract content */}
                    {(bodyHtml || headerHtml) ? (
                      <ContractRenderer headerHtml={headerHtml} bodyHtml={bodyHtml} footerHtml={footerHtml} margins={margins} />
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Contract content is being prepared. Check back shortly.
                      </div>
                    )}

                    {/* ── Signed ── */}
                    {isSigned && (
                      <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4 space-y-2">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> Signed on {new Date(contract.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {contract.signature_data && <img src={contract.signature_data} alt="Your signature" className="h-14 border rounded bg-white" />}
                        {contract.signed_full_name && <p className="text-base font-medium italic">{contract.signed_full_name}</p>}
                      </div>
                    )}

                    {/* ── Negotiating — waiting for HR ── */}
                    {isNegotiating && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 dark:bg-blue-900/10 p-4 flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Your negotiation request has been submitted and is under review by HR.
                          You'll be notified once they respond.
                        </p>
                      </div>
                    )}

                    {/* ── Negotiation rejected — show HR decision ── */}
                    {negRejected && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:bg-amber-900/10 p-4 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          HR has reviewed your negotiation request and was unable to accommodate your terms.
                          {contract.hr_note && ' Please see the note from HR above.'}
                        </p>
                      </div>
                    )}

                    {/* ── Pending — action buttons ── */}
                    {isPending && signingId !== contract.id && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button onClick={() => { setSigningId(contract.id); setSignMode('draw'); setSignature(null); setTypedName(''); }}>
                          <PenTool className="h-4 w-4 mr-1.5" /> Accept & Sign
                        </Button>
                        <Button variant="outline" onClick={() => { setNegotiateId(contract.id); setNegotiateNote(''); }}>
                          <MessageSquare className="h-4 w-4 mr-1.5" /> Negotiate
                        </Button>
                        <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => { setRejectId(contract.id); setRejectReason(''); setRejectCustom(''); }}>
                          <XCircle className="h-4 w-4 mr-1.5" /> Reject offer
                        </Button>
                      </div>
                    )}

                    {/* ── Signing panel ── */}
                    {signingId === contract.id && (
                      <div className="border-t pt-5 space-y-4">
                        <div>
                          <p className="text-sm font-semibold mb-0.5">Sign this contract</p>
                          <p className="text-xs text-muted-foreground">By signing you confirm you have read and agree to all the terms above.</p>
                        </div>
                        <Tabs value={signMode} onValueChange={(v: any) => setSignMode(v)}>
                          <TabsList>
                            <TabsTrigger value="draw"><PenTool className="h-3.5 w-3.5 mr-1.5" /> Draw</TabsTrigger>
                            <TabsTrigger value="type"><Type className="h-3.5 w-3.5 mr-1.5" /> Type name</TabsTrigger>
                          </TabsList>
                          <TabsContent value="draw" className="pt-3">
                            <SignatureCanvas onSignatureChange={setSignature} />
                          </TabsContent>
                          <TabsContent value="type" className="pt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">Typing your full legal name has the same legal effect as a handwritten signature.</p>
                            <Input value={typedName} onChange={e => setTypedName(e.target.value)} placeholder={fullName || 'Your full legal name'} />
                          </TabsContent>
                        </Tabs>
                        <div className="flex gap-2">
                          <Button onClick={() => handleSign(contract.id)} disabled={(signMode === 'draw' ? !signature : !typedName.trim()) || submitting}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} I Accept & Sign
                          </Button>
                          <Button variant="outline" onClick={() => { setSigningId(null); setSignature(null); setTypedName(''); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ Reject dialog ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!rejectId} onOpenChange={o => !o && setRejectId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject this offer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Please select the reason that best describes why you are declining this offer.
              This information helps us improve our process.
            </p>
            <div className="space-y-1.5">
              {REJECTION_REASONS.map(r => (
                <label key={r} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${rejectReason === r ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}>
                  <input type="radio" name="reject_reason" value={r} checked={rejectReason === r}
                    onChange={() => setRejectReason(r)} className="mt-0.5 shrink-0" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            {rejectReason === 'Other (please specify below)' && (
              <Textarea
                rows={3}
                placeholder="Please tell us more…"
                value={rejectCustom}
                onChange={e => setRejectCustom(e.target.value)}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)}>Back</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectSubmitting || !rejectReason}>
              {rejectSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Negotiate dialog ════════════════════════════════════════════════════ */}
      <Dialog open={!!negotiateId} onOpenChange={o => !o && setNegotiateId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request negotiation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Let HR know what you would like to discuss or change. Be specific — this helps them
              respond quickly.
            </p>
            <div className="space-y-1.5">
              <Label>Your negotiation request</Label>
              <Textarea
                rows={5}
                placeholder="e.g. I would like to discuss the salary, start date, or role responsibilities…"
                value={negotiateNote}
                onChange={e => setNegotiateNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This note will be shared with HR and remain visible on your contract.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNegotiateId(null)}>Cancel</Button>
            <Button onClick={handleNegotiate} disabled={negotiateSubmitting || !negotiateNote.trim()}>
              {negotiateSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <MessageSquare className="h-4 w-4 mr-1.5" /> Send negotiation request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default Offers;
