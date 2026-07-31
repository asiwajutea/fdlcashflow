import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/supabase-db';
import SignatureCanvas from '@/components/SignatureCanvas';
import ContractRenderer from '@/components/ContractRenderer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  FileText, CheckCircle, Loader2, PenTool, Type,
  Download, ChevronDown, ChevronUp, Clock, AlertCircle,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ContractWithTemplate {
  contract:  any;
  template:  any | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const pdfHref = (p: string) =>
  p?.startsWith('http')
    ? p
    : p
    ? `https://uppixbfndhlyfeyjoxrg.supabase.co/storage/v1/object/public/documents/${p}`
    : '';

// ─── SingleContract ───────────────────────────────────────────────────────────

function SingleContract({
  item,
  index,
  total,
  onSigned,
}: {
  item: ContractWithTemplate;
  index: number;
  total: number;
  onSigned: () => void;
}) {
  const { fullName } = useAuth();
  const { toast }    = useToast();

  const { contract, template } = item;

  const [expanded,    setExpanded]    = useState(!contract.signed_at); // auto-open unsigned
  const [signMode,    setSignMode]    = useState<'draw' | 'type'>('draw');
  const [signature,   setSignature]   = useState<string | null>(null);
  const [typedName,   setTypedName]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  const bodyHtml   = contract.body_html   || template?.body_html   || '';
  const headerHtml = template?.header_html || '';
  const footerHtml = template?.footer_html || '';
  const attachedPdf = contract.contract_url;
  const templatePdf = template?.pdf_url;
  const captureId   = `contract-doc-${contract.id}`;

  const sign = async () => {
    if (signMode === 'draw' && !signature) {
      toast({ title: 'Please draw your signature', variant: 'destructive' }); return;
    }
    if (signMode === 'type' && !typedName.trim()) {
      toast({ title: 'Please type your full name', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const payload: any = { signed_at: new Date().toISOString(), status: 'signed' };
    if (signMode === 'draw') payload.signature_data = signature;
    else payload.signed_full_name = typedName.trim();
    const { error } = await db.from('contracts').update(payload).eq('id', contract.id);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Signing failed', description: error.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Contract signed', description: 'Thank you — your signed contract is on file.' });
    onSigned();
  };

  const downloadPdf = async () => {
    const el = document.getElementById(captureId);
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const img    = canvas.toDataURL('image/jpeg', 0.9);
      const pdf    = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'JPEG', 0, 0, w, h);
      const slug = (template?.title || `contract-${index + 1}`).replace(/\s+/g, '-').toLowerCase();
      pdf.save(`${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className={`transition-shadow ${!contract.signed_at ? 'border-amber-300 shadow-sm' : ''}`}>
      <CardHeader className="pb-3">
        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${contract.signed_at ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {contract.signed_at
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <Clock className="h-4 w-4 text-amber-600" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">
                {template?.title || `Contract ${index + 1} of ${total}`}
              </CardTitle>
              {total > 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Document {index + 1} of {total}
                </p>
              )}
            </div>
          </div>

          {/* Badges + actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Badge variant={contract.signed_at ? 'default' : 'secondary'} className="gap-1">
              {contract.signed_at ? <><CheckCircle className="h-3 w-3" /> Signed</> : <><AlertCircle className="h-3 w-3" /> Pending signature</>}
            </Badge>
            <Button size="sm" variant="outline" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              PDF
            </Button>
            {(attachedPdf || templatePdf) && (
              <Button size="sm" variant="outline" asChild>
                <a href={pdfHref(attachedPdf || templatePdf)} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5 mr-1" /> Attached
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Signed-on line */}
        {contract.signed_at && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1 ml-9">
            <CheckCircle className="h-3 w-3" />
            Signed on {new Date(contract.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </CardHeader>

      {/* ── Expandable body ── */}
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Contract document */}
          <ContractRenderer
            captureId={captureId}
            headerHtml={headerHtml}
            bodyHtml={bodyHtml || '<em>Contract content is being prepared.</em>'}
            footerHtml={footerHtml}
          />

          {/* Signature section */}
          {contract.signed_at ? (
            <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4 space-y-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> This document is signed
              </p>
              {contract.signature_data && (
                <img src={contract.signature_data} alt="Your signature" className="h-14 border rounded bg-white" />
              )}
              {contract.signed_full_name && (
                <p className="text-base font-medium italic text-foreground">{contract.signed_full_name}</p>
              )}
            </div>
          ) : (
            <div className="border-t pt-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">Sign this document</p>
                <p className="text-xs text-muted-foreground">
                  By signing you confirm you have read and agree to the terms above.
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

              <Button onClick={sign} disabled={submitting} className="w-full sm:w-auto">
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing…</>
                  : 'I Accept & Sign This Document'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── MyContract (page) ────────────────────────────────────────────────────────

export default function MyContract() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [items,   setItems]   = useState<ContractWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Collect all contracts for this user across both paths
    const allContracts: any[] = [];

    // 1. Direct employee assignments (user_id = auth.uid())
    const { data: direct } = await db
      .from('contracts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (direct) allContracts.push(...(direct as any[]));

    // 2. Candidate-pipeline contracts (via applications)
    const { data: cand } = await db
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (cand?.id) {
      const { data: apps } = await db
        .from('applications')
        .select('id')
        .eq('candidate_id', cand.id);
      const appIds = (apps as any[] || []).map((a: any) => a.id);
      if (appIds.length > 0) {
        const { data: cs } = await db
          .from('contracts')
          .select('*')
          .in('application_id', appIds)
          .order('created_at', { ascending: true });
        if (cs) allContracts.push(...(cs as any[]));
      }
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allContracts.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id); return true;
    });

    // Sort: unsigned first, then by created_at
    unique.sort((a, b) => {
      if (!!a.signed_at === !!b.signed_at)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.signed_at ? 1 : -1; // unsigned first
    });

    // Load templates in one batch
    const templateIds = [...new Set(unique.map((c) => c.template_id).filter(Boolean))];
    const templateMap = new Map<string, any>();
    if (templateIds.length > 0) {
      const { data: tpls } = await db
        .from('contract_templates')
        .select('*')
        .in('id', templateIds);
      (tpls as any[] || []).forEach((t: any) => templateMap.set(t.id, t));
    }

    setItems(
      unique.map((c) => ({
        contract: c,
        template: c.template_id ? (templateMap.get(c.template_id) ?? null) : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Contracts">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <DashboardLayout title="My Contracts">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-foreground">No contracts yet</p>
              <p className="text-sm text-muted-foreground">
                Once HR assigns a contract to you it will appear here for review and signing.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── Summary bar ────────────────────────────────────────────────────────────
  const total   = items.length;
  const signed  = items.filter((i) => i.contract.signed_at).length;
  const pending = total - signed;
  const allDone = pending === 0;

  return (
    <DashboardLayout title="My Contracts">
      <div className="max-w-4xl mx-auto space-y-5 px-2 py-4">

        {/* ── Progress summary ── */}
        <Card className={allDone ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'border-amber-200 bg-amber-50/40 dark:bg-amber-900/10'}>
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {allDone
                    ? '🎉 All contracts signed'
                    : `${pending} contract${pending > 1 ? 's' : ''} awaiting your signature`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {signed} of {total} document{total > 1 ? 's' : ''} signed
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[140px]">
                <Progress value={(signed / total) * 100} className="h-2 flex-1" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {signed}/{total}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Contract cards ── */}
        {items.map((item, idx) => (
          <SingleContract
            key={item.contract.id}
            item={item}
            index={idx}
            total={total}
            onSigned={load}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
