import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SignatureCanvas from '@/components/SignatureCanvas';
import ContractRenderer from '@/components/ContractRenderer';
import { FileText, CheckCircle, Loader2, PenTool, Type, Download } from 'lucide-react';

const pdfHref = (p: string) =>
  p?.startsWith('http')
    ? p
    : p
    ? `https://uppixbfndhlyfeyjoxrg.supabase.co/storage/v1/object/public/documents/${p}`
    : '';

const Offers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fullName, loading: authLoading } = useAuth();
  const [contracts,   setContracts]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [signingId,   setSigningId]   = useState<string | null>(null);
  const [signMode,    setSignMode]    = useState<'draw' | 'type'>('draw');
  const [signature,   setSignature]   = useState<string | null>(null);
  const [typedName,   setTypedName]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!candidate) { setLoading(false); return; }

    const { data: apps } = await supabase
      .from('applications')
      .select('id, job_positions!inner(title, department)')
      .eq('candidate_id', candidate.id);

    if (!apps || apps.length === 0) { setLoading(false); return; }

    const appIds = apps.map((a) => a.id);

    // Fetch contracts and their template (for body_html, header_html, footer_html)
    const { data: contractData } = await supabase
      .from('contracts')
      .select(`
        *,
        contract_templates (
          id, title, body_html, header_html, footer_html, pdf_url,
          margin_top, margin_bottom, margin_left, margin_right
        )
      `)
      .in('application_id', appIds)
      .order('created_at', { ascending: false });

    const appMap = new Map(apps.map((a) => [a.id, (a as any).job_positions]));
    setContracts(
      (contractData || []).map((c) => ({
        ...c,
        job: appMap.get(c.application_id),
      }))
    );
    setLoading(false);
  };

  const handleSign = async (contractId: string) => {
    if (signMode === 'draw' && !signature) {
      toast({ title: 'Signature required', description: 'Please draw your signature.', variant: 'destructive' });
      return;
    }
    if (signMode === 'type' && !typedName.trim()) {
      toast({ title: 'Name required', description: 'Please type your full legal name.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const payload: any = {
      signed_at: new Date().toISOString(),
      status:    'signed',
    };
    if (signMode === 'draw') payload.signature_data   = signature;
    else                     payload.signed_full_name = typedName.trim();

    const { error } = await supabase
      .from('contracts')
      .update(payload)
      .eq('id', contractId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contract Signed!', description: 'Your signed contract has been submitted successfully.' });
      supabase.functions.invoke('notify-staff', {
        body: {
          template_key:       'staff_contract_signed',
          email_template_key: 'staff_contract_signed',
          roles:              ['admin'],
          capabilities:       ['manage_recruitment'],
          vars: {
            employee:  fullName || 'A candidate',
            candidate: fullName || 'A candidate',
            title:     contracts.find(c => c.id === contractId)?.job?.title || 'a position',
            job:       contracts.find(c => c.id === contractId)?.job?.title || 'a position',
            signed_at: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }),
            link:      `${window.location.origin}/applications`,
            origin:    window.location.origin,
          },
        },
      }).catch(() => {});
      setSigningId(null);
      setSignature(null);
      setTypedName('');
      fetchContracts();
    }
    setSubmitting(false);
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
              const tpl         = contract.contract_templates;
              const bodyHtml    = contract.body_html  || tpl?.body_html   || '';
              const headerHtml  = tpl?.header_html    || '';
              const footerHtml  = tpl?.footer_html    || '';
              const margins     = tpl ? {
                top:    tpl.margin_top    ?? 56,
                bottom: tpl.margin_bottom ?? 56,
                left:   tpl.margin_left   ?? 64,
                right:  tpl.margin_right  ?? 64,
              } : undefined;
              const hasPdf = contract.contract_url || tpl?.pdf_url;

              return (
                <Card key={contract.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                      <span>{contract.job?.title || tpl?.title || 'Employment Contract'}</span>
                      <div className="flex items-center gap-2">
                        {hasPdf && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={pdfHref(contract.contract_url || tpl?.pdf_url)} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" /> Download PDF
                            </a>
                          </Button>
                        )}
                        <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
                          {contract.status}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* ── Contract content ── */}
                    {(bodyHtml || headerHtml) ? (
                      <ContractRenderer
                        headerHtml={headerHtml}
                        bodyHtml={bodyHtml || '<em>Your contract is being prepared.</em>'}
                        footerHtml={footerHtml}
                        margins={margins}
                      />
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Contract content is being prepared. Please check back shortly or download the PDF above.
                      </div>
                    )}

                    {/* ── Signed state ── */}
                    {contract.status === 'signed' ? (
                      <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4 space-y-2">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> Signed on {new Date(contract.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {contract.signature_data && (
                          <img src={contract.signature_data} alt="Your signature" className="h-14 border rounded bg-white" />
                        )}
                        {contract.signed_full_name && (
                          <p className="text-base font-medium italic text-foreground">{contract.signed_full_name}</p>
                        )}
                      </div>

                    ) : signingId === contract.id ? (
                      /* ── Signing panel ── */
                      <div className="border-t pt-5 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-0.5">Sign this contract</p>
                          <p className="text-xs text-muted-foreground">
                            By signing you confirm you have read and agree to all the terms above.
                          </p>
                        </div>

                        <Tabs value={signMode} onValueChange={(v: any) => setSignMode(v)}>
                          <TabsList>
                            <TabsTrigger value="draw">
                              <PenTool className="h-3.5 w-3.5 mr-1.5" /> Draw signature
                            </TabsTrigger>
                            <TabsTrigger value="type">
                              <Type className="h-3.5 w-3.5 mr-1.5" /> Type full name
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="draw" className="pt-3">
                            <SignatureCanvas onSignatureChange={setSignature} />
                          </TabsContent>

                          <TabsContent value="type" className="pt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Typing your full legal name carries the same legal effect as a handwritten signature.
                            </p>
                            <Input
                              value={typedName}
                              onChange={(e) => setTypedName(e.target.value)}
                              placeholder={fullName || 'Your full legal name'}
                            />
                          </TabsContent>
                        </Tabs>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSign(contract.id)}
                            disabled={(signMode === 'draw' ? !signature : !typedName.trim()) || submitting}
                          >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            I Accept & Sign
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setSigningId(null); setSignature(null); setTypedName(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>

                    ) : (
                      <Button onClick={() => { setSigningId(contract.id); setSignMode('draw'); setSignature(null); setTypedName(''); }}>
                        <PenTool className="h-4 w-4 mr-1.5" /> Review & Sign
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Offers;
