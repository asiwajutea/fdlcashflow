import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/** Format an ISO date in GMT+1 (Africa/Lagos) for display in emails/SMS */
function formatGmt1(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) + ' (GMT+1)';
}

interface InterviewScheduleDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const InterviewScheduleDialog: React.FC<InterviewScheduleDialogProps> = ({
  applicationId,
  open,
  onOpenChange,
  onSaved,
}) => {
  const { toast } = useToast();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      supabase
        .from('interviews')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle()
        .then(({ data: d }) => {
          setInterview(d);
          if (d) {
            setDate(d.interview_date ? d.interview_date.slice(0, 16) : '');
            setMeetingLink(d.meeting_link || '');
            setInterviewer(d.interviewer || '');
            setScore(d.score?.toString() || '');
            setFeedback(d.feedback || '');
            setOutcome(d.outcome || '');
          } else {
            setDate('');
            setMeetingLink('');
            setInterviewer('');
            setScore('');
            setFeedback('');
            setOutcome('');
          }
          setLoading(false);
        });
    }
  }, [open, applicationId]);

  const handleSave = async () => {
    if (!applicationId) return;
    setSaving(true);

    const wasScheduled = !!interview;
    const previousDate = interview?.interview_date || null;
    const previousLink = interview?.meeting_link || null;
    const dateChanged = previousDate !== (date || null);
    const linkChanged = previousLink !== (meetingLink || null);

    const payload: any = {
      application_id: applicationId,
      interview_date: date || null,
      meeting_link: meetingLink || null,
      interviewer: interviewer || null,
      score: score ? Number(score) : null,
      feedback: feedback || null,
      outcome: outcome || null,
    };
    // If time changed, clear reminder flag so the 1-hour reminder can fire again
    if (dateChanged) payload.reminder_sent_at = null;

    let error;
    let savedId = interview?.id as string | undefined;
    if (interview) {
      ({ error } = await supabase.from('interviews').update(payload).eq('id', interview.id));
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('interviews').insert(payload).select('id').maybeSingle();
      error = insErr;
      savedId = inserted?.id;
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: interview ? 'Interview updated.' : 'Interview scheduled.' });

      if (date && savedId) {
        const isUpdate = wasScheduled && (dateChanged || linkChanged);
        notifyCandidate(savedId, applicationId, isUpdate);
        notifyCandidateSms(applicationId, date, meetingLink);
      }

      onOpenChange(false);
      onSaved?.();
    }
    setSaving(false);
  };

  /** Email the candidate with full interview details (schedule or update). */
  const notifyCandidate = async (interviewId: string, appId: string, isUpdate: boolean) => {
    try {
      const { data: iv } = await supabase
        .from('interviews')
        .select('interview_date, meeting_link, interviewer, interview_type, location_platform, office_address, contact_phone')
        .eq('id', interviewId)
        .maybeSingle();
      if (!iv?.interview_date) return;

      const { data: app } = await supabase
        .from('applications').select('candidate_id, job_id').eq('id', appId).maybeSingle();
      if (!app) return;

      const { data: candidate } = await supabase
        .from('candidates').select('user_id').eq('id', app.candidate_id).maybeSingle();
      if (!candidate?.user_id) return;

      const { data: job } = await supabase
        .from('job_positions').select('title').eq('id', app.job_id).maybeSingle();

      await supabase.functions.invoke('send-email', {
        body: {
          user_id: candidate.user_id,
          template_key: isUpdate ? 'candidate_interview_updated' : 'candidate_interview',
          vars: {
            job: job?.title || 'the position',
            date: formatGmt1(iv.interview_date),
            interview_type: iv.interview_type || '',
            location: iv.location_platform || '',
            address: iv.office_address || '',
            interviewer: iv.interviewer || '',
            contact_phone: iv.contact_phone || '',
            link: iv.meeting_link || '',
            origin: window.location.origin,
          },
        },
      });
    } catch (e) {
      console.error('Interview email notification failed:', e);
    }
  };



  /** Fire-and-forget SMS to the candidate with interview date/time */
  const notifyCandidateSms = async (appId: string, interviewDate: string, link: string) => {
    try {
      // Step 1: get candidate_id and job_id from the application (no join — avoids RLS/FK name issues)
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select('candidate_id, job_id')
        .eq('id', appId)
        .maybeSingle();

      if (appError) { console.error('Interview SMS: application fetch failed', appError.message); return; }
      if (!app) { console.error('Interview SMS: application not found for id', appId); return; }

      // Step 2: get candidate user_id
      const { data: candidate, error: candError } = await supabase
        .from('candidates')
        .select('user_id')
        .eq('id', app.candidate_id)
        .maybeSingle();

      if (candError) { console.error('Interview SMS: candidate fetch failed', candError.message); return; }
      if (!candidate?.user_id) { console.error('Interview SMS: no user_id for candidate', app.candidate_id); return; }

      // Step 3: get job title separately
      const { data: job } = await supabase
        .from('job_positions')
        .select('title')
        .eq('id', app.job_id)
        .maybeSingle();

      const jobTitle = job?.title || 'the position';

      // Step 4: format date — use en-NG locale for Nigeria-friendly output
      const formatted = new Date(interviewDate).toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          user_id:      candidate.user_id,
          template_key: 'candidate_interview_scheduled',
          vars: {
            job:  jobTitle,
            date: formatted,
            link: link || `${window.location.origin}/interviews`,
          },
        },
      });

      if (smsError) {
        console.error('Interview SMS: send-sms failed', smsError.message);
      } else {
        console.log('Interview SMS: sent to user', candidate.user_id, 'for job', jobTitle);
      }
    } catch (e) {
      console.error('Interview SMS notification failed:', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{interview ? 'Manage Interview' : 'Schedule Interview'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interview Date & Time</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Interviewer</Label>
              <Input
                placeholder="Interviewer name"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
              />
            </div>

            {interview && (
              <>
                <hr className="my-2 border-border" />
                <h4 className="text-sm font-semibold text-foreground">Interview Feedback</h4>
                <div className="space-y-2">
                  <Label>Score (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <Textarea
                    placeholder="Interview feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {interview ? 'Update Interview' : 'Schedule Interview'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterviewScheduleDialog;
