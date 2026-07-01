import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SignatureCanvas from '@/components/SignatureCanvas';
import { FileText, CheckCircle, Loader2 } from 'lucide-react';

const Offers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    if (!candidate) {
      setLoading(false);
      return;
    }

    const { data: apps } = await supabase
      .from('applications')
      .select('id, job_positions!inner(title, department)')
      .eq('candidate_id', candidate.id);

    if (!apps || apps.length === 0) {
      setLoading(false);
      return;
    }

    const appIds = apps.map((a) => a.id);
    const { data: contractData } = await supabase
      .from('contracts')
      .select('*')
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
    if (!signature) {
      toast({
        title: 'Signature Required',
        description: 'Please draw your signature before signing.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase
      .from('contracts')
      .update({
        signature_data: signature,
        signed_at: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', contractId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contract Signed!', description: 'Your signed contract has been submitted successfully.' });
      // Notify admins and HR
      supabase.functions.invoke('notify-staff', {
        body: {
          template_key: 'staff_contract_signed',
          roles: ['admin'],
          capabilities: ['manage_recruitment'],
          vars: {
            candidate: 'A candidate',
            job: contracts.find(c => c.id === contractId)?.job?.title || 'a position',
            link: `${window.location.origin}/applications`,
          },
        },
      }).catch(() => {});
      setSigningId(null);
      setSignature(null);
      fetchContracts();
    }
    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Offers">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Offers & Contracts">
      <div className="space-y-6">
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
          <div className="grid gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{contract.job?.title || 'Position'}</span>
                    <Badge variant={contract.status === 'signed' ? 'default' : 'secondary'}>
                      {contract.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contract.contract_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={contract.contract_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-1" /> View Contract Document
                      </a>
                    </Button>
                  )}

                  {contract.status === 'signed' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Signed on {new Date(contract.signed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ) : signingId === contract.id ? (
                    <div className="space-y-4 border-t pt-4">
                      <p className="text-sm font-medium">Draw your signature below to accept the contract:</p>
                      <SignatureCanvas onSignatureChange={setSignature} />
                      <div className="flex gap-2">
                        <Button onClick={() => handleSign(contract.id)} disabled={!signature || submitting}>
                          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          I Accept & Sign
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSigningId(null);
                            setSignature(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setSigningId(contract.id)}>Sign Contract</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Offers;
