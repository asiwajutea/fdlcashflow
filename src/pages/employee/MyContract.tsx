import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import SignatureCanvas from '@/components/SignatureCanvas';
import { FileText, CheckCircle, Loader2, PenTool, Type } from 'lucide-react';

export default function MyContract() {
  const { user, fullName, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cand } = await db.from('candidates').select('id').eq('user_id', user.id).maybeSingle();
    let candId = cand?.id;
    const { data: apps } = candId
      ? await db.from('applications').select('id').eq('candidate_id', candId)
      : { data: [] as any[] };
    const ids = (apps as any[] || []).map((a: any) => a.id);
    if (ids.length === 0) { setLoading(false); return; }
    const { data: cs } = await db.from('contracts').select('*').in('application_id', ids).order('created_at', { ascending: false });
    const unsigned = (cs as any[] || []).find((c: any) => !c.signed_at) || (cs as any[] || [])[0];
    setContract(unsigned || null);
    if (unsigned?.template_id) {
      const { data: t } = await db.from('contract_templates').select('*').eq('id', unsigned.template_id).maybeSingle();
      setTemplate(t);
    }
    setLoading(false);
  };

  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  const sign = async () => {
    if (!contract) return;
    if (signMode === 'draw' && !signature) { toast({ title: 'Please draw your signature', variant: 'destructive' }); return; }
    if (signMode === 'type' && !typedName.trim()) { toast({ title: 'Please type your full name', variant: 'destructive' }); return; }
    setSubmitting(true);
    const payload: any = { signed_at: new Date().toISOString(), status: 'signed' };
    if (signMode === 'draw') payload.signature_data = signature;
    else payload.signed_full_name = typedName.trim();
    const { error } = await db.from('contracts').update(payload).eq('id', contract.id);
    setSubmitting(false);
    if (error) { toast({ title: 'Signing failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contract signed', description: 'Thank you — your signed contract is on file.' });
    load();
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Contract">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout title="My Contract">
        <Card className="max-w-xl mx-auto">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3" />
            No contracts assigned yet. Once HR sends you one it will appear here.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const bodyText = contract.body_html || template?.body_html || '';

  return (
    <DashboardLayout title="My Contract">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Employment Contract</CardTitle>
            <Badge variant={contract.signed_at ? 'default' : 'secondary'}>{contract.signed_at ? 'Signed' : 'Pending'}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract.contract_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={contract.contract_url.startsWith('http') ? contract.contract_url : `https://uppixbfndhlyfeyjoxrg.supabase.co/storage/v1/object/public/documents/${contract.contract_url}`} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-1" /> View attached PDF
                </a>
              </Button>
            )}
            {bodyText && (
              <div className="prose prose-sm max-w-none rounded border bg-muted/30 p-4 whitespace-pre-wrap text-sm">{bodyText}</div>
            )}

            {contract.signed_at ? (
              <div className="flex items-center gap-2 text-green-600 border-t pt-3">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Signed on {new Date(contract.signed_at).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="border-t pt-4 space-y-3">
                <Tabs value={signMode} onValueChange={(v: any) => setSignMode(v)}>
                  <TabsList>
                    <TabsTrigger value="draw"><PenTool className="h-3.5 w-3.5 mr-1" /> Draw signature</TabsTrigger>
                    <TabsTrigger value="type"><Type className="h-3.5 w-3.5 mr-1" /> Type full name</TabsTrigger>
                  </TabsList>
                  <TabsContent value="draw" className="pt-3">
                    <SignatureCanvas onSignatureChange={setSignature} />
                  </TabsContent>
                  <TabsContent value="type" className="pt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Typing your full legal name has the same legal effect as a handwritten signature.</p>
                    <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={fullName || 'Your full legal name'} />
                  </TabsContent>
                </Tabs>
                <Button onClick={sign} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} I Accept &amp; Sign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
