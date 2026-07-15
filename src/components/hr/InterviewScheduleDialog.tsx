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

    const payload = {
      application_id: applicationId,
      interview_date: date || null,
      meeting_link: meetingLink || null,
      interviewer: interviewer || null,
      score: score ? Number(score) : null,
      feedback: feedback || null,
      outcome: outcome || null,
    };

    let error;
    if (interview) {
      ({ error } = await supabase.from('interviews').update(payload).eq('id', interview.id));
    } else {
      ({ error } = await supabase.from('interviews').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: interview ? 'Interview updated.' : 'Interview scheduled.' });

      // Send SMS to candidate if a date was set or changed
      if (date) {
        notifyCandidateSms(applicationId, date, meetingLink);
      }

      onOpenChange(false);
      onSaved?.();
    }
    setSaving(false);
  };

  /** Fire-and-forget SMS to the candidate with interview date/time */
  const notifyCandidateSms = async (appId: string, interviewDate: string, link: string) => {
    try {
      // Resolve candidate user_id and job title from the application
      const { data: app } = await supabase
        .from('applications')
        .select('candidate_id, job_positions!inner(title)')
        .eq('id', appId)
        .maybeSingle();
      if (!app) return;

      const { data: candidate } = await supabase
        .from('candidates')
        .select('user_id')
        .eq('id', app.candidate_id)
        .maybeSingle();
      if (!candidate?.user_id) return;

      // Format the date nicely e.g. "Wednesday, 16 Jul 2026 at 10:00 AM"
      const formatted = new Date(interviewDate).toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      const jobTitle = (app as any).job_positions?.title || 'the position';

      supabase.functions.invoke('send-sms', {
        body: {
          user_id:      candidate.user_id,
          template_key: 'candidate_interview_scheduled',
          vars: {
            job:  jobTitle,
            date: formatted,
            link: link || `${window.location.origin}/interviews`,
          },
        },
      }).catch(() => {});
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
