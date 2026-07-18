import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Phone, Video, Building2, CheckCircle2, Save } from 'lucide-react';

interface InterviewScheduleDialogProps {
  applicationId: string | null;
  candidateName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const VIRTUAL_PLATFORMS = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom',        label: 'Zoom' },
  { value: 'whatsapp',    label: 'WhatsApp Video' },
];

/** Format date/time in West Africa Time (UTC+1) */
function formatWat(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) + ' (WAT)';
}

const InterviewScheduleDialog: React.FC<InterviewScheduleDialogProps> = ({
  applicationId,
  candidateName,
  open,
  onOpenChange,
  onSaved,
}) => {
  const { toast } = useToast();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Scheduling fields
  const [date,             setDate]             = useState('');
  const [interviewType,    setInterviewType]    = useState<'virtual' | 'physical'>('virtual');
  const [locationPlatform, setLocationPlatform] = useState('google_meet');
  const [meetingLink,      setMeetingLink]      = useState('');
  const [officeAddress,    setOfficeAddress]    = useState('');
  const [contactPhone,     setContactPhone]     = useState('');
  const [interviewer,      setInterviewer]      = useState('');

  // Feedback fields (separate save — no candidate notification) — per-HR
  const [score,    setScore]    = useState('');
  const [feedback, setFeedback] = useState('');
  const [outcome,  setOutcome]  = useState('awaiting_decision');
  const [aggregate, setAggregate] = useState<{ hr_count: number; avg_score: number | null }>({ hr_count: 0, avg_score: null });

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      (async () => {
        const { data: d } = await supabase
          .from('interviews')
          .select('*')
          .eq('application_id', applicationId)
          .maybeSingle();
        setInterview(d);
        if (d) {
          setDate(d.interview_date ? d.interview_date.slice(0, 16) : '');
          setInterviewType((d.interview_type as 'virtual' | 'physical') || 'virtual');
          setLocationPlatform(d.location_platform || 'google_meet');
          setMeetingLink(d.meeting_link || '');
          setOfficeAddress(d.office_address || '');
          setContactPhone(d.contact_phone || '');
          setInterviewer(d.interviewer || '');

          // Load THIS HR's private score row
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes?.user?.id;
          if (uid) {
            const { data: myScore } = await (supabase as any)
              .from('interview_hr_scores')
              .select('score, feedback, outcome')
              .eq('interview_id', d.id)
              .eq('hr_user_id', uid)
              .maybeSingle();
            setScore(myScore?.score?.toString() || '');
            setFeedback(myScore?.feedback || '');
            setOutcome(myScore?.outcome || 'awaiting_decision');
          }
          // Load aggregate (admin sees all; HR sees only own — RPC uses SECURITY DEFINER)
          const { data: stats } = await (supabase as any).rpc('get_interview_score_stats', { _interview_id: d.id });
          if (stats && stats[0]) setAggregate({ hr_count: stats[0].hr_count || 0, avg_score: stats[0].avg_score });
        } else {
          setDate(''); setInterviewType('virtual'); setLocationPlatform('google_meet');
          setMeetingLink(''); setOfficeAddress(''); setContactPhone('');
          setInterviewer(''); setScore(''); setFeedback(''); setOutcome('awaiting_decision');
          setAggregate({ hr_count: 0, avg_score: null });
        }
        setLoading(false);
      })();
    }
  }, [open, applicationId]);

  // ── Save schedule (with candidate notification) ───────────────────────────
  const handleSaveSchedule = async () => {
    if (!applicationId) return;

    if (!date) { toast({ title: 'Please set an interview date and time', variant: 'destructive' }); return; }
    if (interviewType === 'virtual' && !meetingLink.trim()) {
      toast({ title: 'Please provide a meeting link for the virtual interview', variant: 'destructive' }); return;
    }
    if (interviewType === 'physical' && !officeAddress.trim()) {
      toast({ title: 'Please provide the office address for the physical interview', variant: 'destructive' }); return;
    }

    setSavingSchedule(true);

    // Convert datetime-local string to UTC, anchored to Africa/Lagos (UTC+1)
    const dateAsWat = date ? new Date(date + ':00+01:00').toISOString() : null;
    const dateChanged = interview && interview.interview_date !== dateAsWat;

    const payload: Record<string, any> = {
      application_id:    applicationId,
      interview_date:    dateAsWat,
      interview_type:    interviewType,
      location_platform: interviewType === 'virtual' ? locationPlatform : 'office',
      meeting_link:      interviewType === 'virtual' ? (meetingLink || null) : null,
      office_address:    interviewType === 'physical' ? (officeAddress || null) : null,
      contact_phone:     contactPhone || null,
      interviewer:       interviewer || null,
    };

    // Reset reminder if date changed so the 1-hour reminder fires again
    if (dateChanged) payload.reminder_sent_at = null;

    let error: any;
    let savedId = interview?.id as string | undefined;

    if (interview) {
      ({ error } = await supabase.from('interviews').update(payload).eq('id', interview.id));
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('interviews').insert(payload as any).select('id').maybeSingle();
      error = insErr;
      savedId = inserted?.id;
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const isUpdate = !!interview;
      toast({ title: 'Saved', description: isUpdate ? 'Interview updated — candidate notified.' : 'Interview scheduled — candidate notified.' });
      // Always notify on schedule save (new schedule or reschedule)
      if (dateAsWat) {
        notifyCandidateSms(applicationId, dateAsWat, payload);
        if (savedId) notifyCandidateEmail(savedId, applicationId, isUpdate);
      }
      onOpenChange(false);
      onSaved?.();
    }
    setSavingSchedule(false);
  };

  // ── Save feedback only (NO candidate notification) ────────────────────────
  const handleSaveFeedback = async () => {
    if (!interview) return;
    setSavingFeedback(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) {
      setSavingFeedback(false);
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }

    const { error } = await (supabase as any).from('interview_hr_scores').upsert({
      interview_id: interview.id,
      hr_user_id:   uid,
      score:        score ? Number(score) : null,
      feedback:     feedback || null,
      outcome:      outcome || 'awaiting_decision',
    }, { onConflict: 'interview_id,hr_user_id' });

    setSavingFeedback(false);
    if (error) {
      toast({ title: 'Error saving feedback', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Your feedback saved', description: 'Only you (and admins) can see your score.' });
      onOpenChange(false);
      onSaved?.();
    }
  };

  // ── Email notification ────────────────────────────────────────────────────
  const notifyCandidateEmail = async (interviewId: string, appId: string, isUpdate: boolean) => {
    try {
      const { data: iv } = await supabase
        .from('interviews')
        .select('interview_date, meeting_link, interviewer, interview_type, location_platform, office_address, contact_phone')
        .eq('id', interviewId).maybeSingle();
      if (!iv?.interview_date) return;

      const { data: app } = await supabase
        .from('applications').select('candidate_id, job_id').eq('id', appId).maybeSingle();
      if (!app) return;

      const { data: candidate } = await supabase
        .from('candidates').select('user_id').eq('id', app.candidate_id).maybeSingle();
      if (!candidate?.user_id) return;

      const { data: job } = await supabase
        .from('job_positions').select('title').eq('id', app.job_id).maybeSingle();

      const platformLabels: Record<string, string> = {
        google_meet: 'Google Meet', zoom: 'Zoom', whatsapp: 'WhatsApp Video', office: 'In-Person',
      };

      supabase.functions.invoke('send-email', {
        body: {
          user_id:      candidate.user_id,
          template_key: isUpdate ? 'candidate_interview_updated' : 'candidate_interview',
          vars: {
            job:            job?.title || 'the position',
            date:           formatWat(iv.interview_date),
            interview_type: iv.interview_type === 'physical' ? 'In-Person' : 'Virtual',
            location:       platformLabels[iv.location_platform || ''] || iv.location_platform || '',
            address:        iv.office_address || '',
            interviewer:    iv.interviewer || '',
            contact_phone:  iv.contact_phone || '',
            link:           iv.meeting_link || '',
            origin:         window.location.origin,
          },
        },
      }).catch((e: any) => console.error('Interview email failed:', e));
    } catch (e) {
      console.error('Interview email notification failed:', e);
    }
  };

  // ── SMS notification ──────────────────────────────────────────────────────
  const notifyCandidateSms = async (appId: string, interviewDate: string, details: Record<string, any>) => {
    try {
      const { data: app, error: appError } = await supabase
        .from('applications').select('candidate_id, job_id').eq('id', appId).maybeSingle();
      if (appError) { console.error('Interview SMS: app fetch failed', appError.message); return; }
      if (!app)     { console.error('Interview SMS: app not found', appId); return; }

      const { data: candidate, error: candError } = await supabase
        .from('candidates').select('user_id').eq('id', app.candidate_id).maybeSingle();
      if (candError || !candidate?.user_id) { console.error('Interview SMS: candidate lookup failed'); return; }

      const { data: job } = await supabase
        .from('job_positions').select('title').eq('id', app.job_id).maybeSingle();

      const jobTitle = job?.title || 'the position';
      const isVirtual = details.interview_type === 'virtual';
      const platformLabels: Record<string, string> = { google_meet: 'Google Meet', zoom: 'Zoom', whatsapp: 'WhatsApp Video' };
      const locationText = isVirtual
        ? `${platformLabels[details.location_platform] || 'Online'}${details.meeting_link ? `: ${details.meeting_link}` : ''}`
        : `In-Person — ${details.office_address || 'address to be confirmed'}`;

      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          user_id:      candidate.user_id,
          template_key: 'candidate_interview_scheduled',
          vars: {
            job:     jobTitle,
            date:    formatWat(interviewDate),
            link:    locationText,
            contact: details.contact_phone || '',
          },
        },
      });
      if (smsError) console.error('Interview SMS failed:', smsError.message);
      else console.log('Interview SMS sent to', candidate.user_id);
    } catch (e) {
      console.error('Interview SMS notification failed:', e);
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  const isVirtual = interviewType === 'virtual';
  const hasInterview = !!interview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle>{hasInterview ? 'Manage Interview' : 'Schedule Interview'}</DialogTitle>
            {hasInterview && interview.outcome && (
              <Badge variant={interview.outcome === 'pass' ? 'default' : 'destructive'} className="capitalize text-xs">
                {interview.outcome}
              </Badge>
            )}
          </div>
          {candidateName && (
            <p className="text-sm text-muted-foreground mt-0.5">Candidate: <span className="font-medium text-foreground">{candidateName}</span></p>
          )}
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">

            {/* ── SECTION: Schedule (always shown) ── */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Interview Date & Time <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Interview Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setInterviewType('virtual')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${isVirtual ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                    <Video className="h-4 w-4" /> Virtual
                  </button>
                  <button type="button" onClick={() => setInterviewType('physical')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${!isVirtual ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                    <Building2 className="h-4 w-4" /> Physical
                  </button>
                </div>
              </div>

              {isVirtual && (
                <>
                  <div className="space-y-1.5">
                    <Label>Platform</Label>
                    <Select value={locationPlatform} onValueChange={setLocationPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VIRTUAL_PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meeting Link <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder={locationPlatform === 'google_meet' ? 'https://meet.google.com/...' : locationPlatform === 'zoom' ? 'https://zoom.us/j/...' : 'WhatsApp number or meeting link'}
                      value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)}
                    />
                  </div>
                </>
              )}

              {!isVirtual && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Office Address <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="e.g. Footprints Dynasty Limited, 12 Main Street, Lagos" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} rows={3} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> HR Contact Phone</Label>
                <Input type="tel" placeholder="e.g. 08012345678" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                <p className="text-xs text-muted-foreground">Shared with the candidate so they can reach HR if needed.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Interviewer</Label>
                <Input placeholder="Interviewer name" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />
              </div>

              {/* Schedule save button — always notifies candidate */}
              <Button onClick={handleSaveSchedule} disabled={savingSchedule} className="w-full">
                {savingSchedule && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {hasInterview ? 'Update Schedule & Notify Candidate' : 'Schedule Interview & Notify Candidate'}
              </Button>
            </div>

            {/* ── SECTION: Feedback (only after interview exists) ── */}
            {hasInterview && (
              <>
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">Your Interview Feedback</h4>
                    <p className="text-xs text-muted-foreground">— private to you & admins</p>
                  </div>
                  {aggregate.hr_count > 0 && (
                    <div className="text-xs bg-muted/40 border rounded-md px-3 py-2">
                      <span className="font-medium">{aggregate.hr_count}</span> HR{aggregate.hr_count === 1 ? '' : 's'} scored
                      {aggregate.avg_score != null && <> · Average: <span className="font-semibold">{Number(aggregate.avg_score).toFixed(1)}/10</span></>}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Your Score (1–10)</Label>
                    <Input type="number" min="1" max="10" value={score} onChange={(e) => setScore(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Your Notes</Label>
                    <Textarea placeholder="Interview notes and observations..." value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Your Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awaiting_decision">Awaiting Decision</SelectItem>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Feedback save — NO notification */}
                  <Button
                    variant="outline"
                    onClick={handleSaveFeedback}
                    disabled={savingFeedback}
                    className="w-full gap-1.5"
                  >
                    {savingFeedback
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                      : <><CheckCircle2 className="h-4 w-4" /> Save My Feedback</>
                    }
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterviewScheduleDialog;
