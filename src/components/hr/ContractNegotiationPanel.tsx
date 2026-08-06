/**
 * ContractNegotiationPanel
 * Shown in the Applications page (and the contract dialog) when a candidate
 * has submitted a negotiation request or HR has rejected a negotiation.
 *
 * HR can:
 *   • Accept negotiation → cancels the old contract (status: 'negotiation_accepted')
 *     so HR can issue a fresh offer
 *   • Reject negotiation → with a note, then choose to resend offer or drop the candidate
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { MessageSquare, CheckCircle2, XCircle, Loader2, RotateCcw, UserX, Info } from 'lucide-react';

interface Props {
  contract: {
    id: string;
    status: string;
    candidate_reason: string | null;
    hr_note: string | null;
    application_id: string | null;
  };
  candidateName: string;
  jobTitle: string;
  onRefresh: () => void;
}

export function ContractNegotiationPanel({ contract, candidateName, jobTitle, onRefresh }: Props) {
  const { user }   = useAuth();
  const { toast }  = useToast();

  const [actionOpen,   setActionOpen]   = useState(false);
  const [action,       setAction]       = useState<'accept' | 'reject' | null>(null);
  const [hrNote,       setHrNote]       = useState('');
  const [afterReject,  setAfterReject]  = useState<'resend' | 'cancel' | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const isNegotiating  = contract.status === 'negotiating';
  const isNegRejected  = contract.status === 'negotiation_rejected';

  const openAction = (a: 'accept' | 'reject') => {
    setAction(a);
    setHrNote('');
    setAfterReject(null);
    setActionOpen(true);
  };

  const handleSubmit = async () => {
    if (!action) return;
    if (!hrNote.trim() && action === 'reject') {
      toast({ title: 'Please add a note explaining your decision', variant: 'destructive' }); return;
    }
    if (action === 'reject' && !afterReject) {
      toast({ title: 'Please choose what to do after rejecting the negotiation', variant: 'destructive' }); return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      if (action === 'accept') {
        // Mark as negotiation_accepted — HR will issue a new contract separately
        await db.from('contracts').update({
          status:           'negotiation_accepted',
          hr_response:      'accepted',
          hr_note:          hrNote.trim() || null,
          hr_responded_at:  now,
          hr_responded_by:  user?.id,
        }).eq('id', contract.id);

        toast({
          title: 'Negotiation accepted',
          description: `The current contract has been cancelled. You can now send ${candidateName} a revised offer.`,
        });

      } else {
        // Reject negotiation
        const newStatus = afterReject === 'cancel' ? 'cancelled' : 'negotiation_rejected';
        await db.from('contracts').update({
          status:           newStatus,
          hr_response:      'rejected',
          hr_note:          hrNote.trim(),
          hr_responded_at:  now,
          hr_responded_by:  user?.id,
        }).eq('id', contract.id);

        if (afterReject === 'cancel' && contract.application_id) {
          // Also update application status to rejected
          await db.from('applications').update({ status: 'rejected' }).eq('id', contract.application_id);
          toast({ title: 'Offer cancelled', description: `${candidateName}'s application has been marked as rejected.` });
        } else {
          toast({
            title: 'Negotiation declined',
            description: `${candidateName} has been notified. You can now resend the original offer.`,
          });
        }
      }

      // Notify candidate via inbox
      try {
        if (contract.application_id) {
          const { data: app } = await db.from('applications').select('candidate_id').eq('id', contract.application_id).maybeSingle();
          if (app?.candidate_id) {
            const { data: cand } = await db.from('candidates').select('user_id').eq('id', app.candidate_id).maybeSingle();
            if (cand?.user_id) {
              const subject = action === 'accept'
                ? `Your negotiation request for ${jobTitle} has been accepted`
                : `Update on your negotiation request for ${jobTitle}`;
              const body = action === 'accept'
                ? `Your negotiation request has been accepted. HR will be in touch with a revised offer shortly.\n\n${hrNote ? `Note from HR: ${hrNote}` : ''}`
                : `HR has reviewed your negotiation request and was unable to accommodate your terms at this time.\n\nNote from HR: ${hrNote}\n\n${afterReject === 'cancel' ? 'Your offer has been withdrawn.' : 'The original offer remains open for your consideration.'}`;
              await supabase.from('messages').insert({
                sender_id:    user?.id,
                recipient_id: cand.user_id,
                subject,
                body,
              });
            }
          }
        }
      } catch { /* non-fatal */ }

      setActionOpen(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
              {isNegotiating ? 'Negotiation requested' : 'Negotiation previously declined'}
              <Badge variant="outline" className="text-xs py-0">{contract.status.replace(/_/g,' ')}</Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {candidateName} — {jobTitle}
            </p>
          </div>
        </div>

        {/* Candidate's note */}
        {contract.candidate_reason && (
          <div className="rounded-lg bg-muted/40 border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Candidate's note:</p>
            <p className="text-sm text-foreground">{contract.candidate_reason}</p>
          </div>
        )}

        {/* Previous HR note */}
        {contract.hr_note && (
          <div className="rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 p-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
              <Info className="h-3 w-3" /> Your previous note to candidate:
            </p>
            <p className="text-sm text-foreground">{contract.hr_note}</p>
          </div>
        )}

        {/* Actions */}
        {isNegotiating && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => openAction('accept')}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Accept negotiation
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => openAction('reject')}>
              <XCircle className="h-3.5 w-3.5" /> Decline negotiation
            </Button>
          </div>
        )}
        {isNegRejected && (
          <p className="text-xs text-muted-foreground">
            You have declined this negotiation. You can resend the original offer or withdraw it using the contract actions above.
          </p>
        )}
      </div>

      {/* ── Action dialog ── */}
      <Dialog open={actionOpen} onOpenChange={o => !o && setActionOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === 'accept' ? 'Accept negotiation' : 'Decline negotiation'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {action === 'accept' ? (
              <p className="text-sm text-muted-foreground">
                Accepting will cancel the current contract and allow you to send a revised offer.
                You may optionally add a note that the candidate will see.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please explain your decision to the candidate. This note is mandatory and will be visible to them.
              </p>
            )}

            <div className="space-y-1.5">
              <Label>{action === 'accept' ? 'Note to candidate (optional)' : 'Note to candidate (required)'}</Label>
              <Textarea
                rows={3}
                placeholder={action === 'accept'
                  ? 'e.g. We are happy to discuss your terms — our HR team will be in touch with a revised offer.'
                  : 'e.g. After careful consideration, we are unable to accommodate the requested changes at this time.'}
                value={hrNote}
                onChange={e => setHrNote(e.target.value)}
              />
            </div>

            {action === 'reject' && (
              <div className="space-y-2">
                <Label>After declining, what would you like to do?</Label>
                {[
                  { value: 'resend', label: 'Keep the offer open', desc: 'The candidate can still accept the original offer', icon: RotateCcw },
                  { value: 'cancel', label: 'Withdraw the offer', desc: 'The offer is cancelled and the candidate is rejected', icon: UserX },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${afterReject === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}>
                    <input type="radio" name="after_reject" value={opt.value} checked={afterReject === opt.value}
                      onChange={() => setAfterReject(opt.value as any)} className="mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionOpen(false)} disabled={submitting}>Cancel</Button>
            <Button
              variant={action === 'accept' ? 'default' : 'destructive'}
              onClick={handleSubmit}
              disabled={submitting}
              className={action === 'accept' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {action === 'accept' ? 'Accept & cancel current contract' : 'Decline negotiation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ContractNegotiationPanel;
