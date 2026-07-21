import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Video, CalendarPlus, MapPin, Phone, Building2, Monitor } from 'lucide-react';

// Generate a Google Calendar URL for an interview
function googleCalendarUrl(interview: any, jobTitle: string): string {
  if (!interview.interview_date) return '';
  const start = new Date(interview.interview_date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const locationLine = interview.interview_type === 'physical'
    ? interview.office_address || ''
    : interview.meeting_link || '';
  const details = [
    interview.interviewer ? `Interviewer: ${interview.interviewer}` : '',
    interview.interview_type === 'physical' ? `Type: In-Person` : `Type: Virtual (${PLATFORM_LABELS[interview.location_platform] || ''})`,
    interview.meeting_link && interview.interview_type !== 'physical' ? `Meeting link: ${interview.meeting_link}` : '',
    interview.office_address && interview.interview_type === 'physical' ? `Address: ${interview.office_address}` : '',
    interview.contact_phone ? `HR Contact: ${interview.contact_phone}` : '',
  ].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(`Interview: ${jobTitle}`)}`
    + `&dates=${fmt(start)}/${fmt(end)}`
    + `&details=${encodeURIComponent(details)}`
    + (locationLine ? `&location=${encodeURIComponent(locationLine)}` : '');
}

// Generate an .ics file download for Apple Calendar / Outlook
function downloadICS(interview: any, jobTitle: string) {
  if (!interview.interview_date) return;
  const start = new Date(interview.interview_date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `interview-${interview.id}@fdlworkforce`;
  const locationLine = interview.interview_type === 'physical'
    ? interview.office_address || ''
    : interview.meeting_link || '';
  const descParts = [
    interview.interviewer   ? `Interviewer: ${interview.interviewer}` : '',
    interview.interview_type === 'physical' ? 'Type: In-Person' : `Type: Virtual`,
    interview.meeting_link  && interview.interview_type !== 'physical' ? `Meeting link: ${interview.meeting_link}` : '',
    interview.office_address && interview.interview_type === 'physical' ? `Address: ${interview.office_address}` : '',
    interview.contact_phone ? `HR Contact: ${interview.contact_phone}` : '',
  ].filter(Boolean).join('\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FDL Workforce//Interview//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Interview: ${jobTitle}`,
    descParts ? `DESCRIPTION:${descParts}` : '',
    locationLine ? `LOCATION:${locationLine}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `interview-${jobTitle.replace(/\s+/g, '-')}.ics`;
  a.click(); URL.revokeObjectURL(url);
}

const PLATFORM_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  whatsapp: 'WhatsApp Video',
  office: 'In-Person',
};

const Interviews = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchInterviews();
  }, [user]);

  const fetchInterviews = async () => {
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
    const { data: interviewData, error } = await supabase
      .from('interviews')
      .select('*')
      .in('application_id', appIds)
      .order('interview_date', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    const appMap = new Map(apps.map((a) => [a.id, (a as any).job_positions]));
    setInterviews(
      (interviewData || []).map((i) => ({
        ...i,
        job: appMap.get(i.application_id),
      }))
    );
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Interviews">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Interviews">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> My Interviews
        </h2>

        {interviews.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Interviews Scheduled</h3>
            <p className="text-muted-foreground">Interview details will appear here once scheduled by the HR team.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {interviews.map((interview) => (
              <Card key={interview.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{interview.job?.title || 'Position'}</span>
                    {interview.outcome && (
                      <Badge variant={interview.outcome === 'pass' ? 'default' : 'destructive'}>
                        {interview.outcome}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {interview.interview_date
                          ? new Date(interview.interview_date).toLocaleString()
                          : 'To be confirmed'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interviewer</p>
                      <p className="font-medium">{interview.interviewer || 'To be confirmed'}</p>
                    </div>
                  </div>

                  {/* Interview type & location */}
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {interview.interview_type === 'physical'
                        ? <><Building2 className="h-4 w-4 text-primary shrink-0" /> In-Person Interview</>
                        : <><Monitor className="h-4 w-4 text-primary shrink-0" /> Virtual Interview</>
                      }
                      {interview.location_platform && interview.location_platform !== 'office' && (
                        <span className="text-xs text-muted-foreground font-normal">
                          via {PLATFORM_LABELS[interview.location_platform] || interview.location_platform}
                        </span>
                      )}
                    </div>

                    {/* Virtual: meeting link */}
                    {interview.interview_type !== 'physical' && interview.meeting_link && (
                      <div className="flex items-start gap-2">
                        <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Meeting link</p>
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline break-all text-xs"
                          >
                            {interview.meeting_link}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Physical: office address */}
                    {interview.interview_type === 'physical' && interview.office_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Office address</p>
                          <p className="text-sm whitespace-pre-line">{interview.office_address}</p>
                        </div>
                      </div>
                    )}

                    {/* HR contact phone */}
                    {interview.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">HR contact</p>
                          <a href={`tel:${interview.contact_phone}`} className="text-sm font-medium hover:underline">
                            {interview.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Join button for virtual */}
                  {interview.interview_type !== 'physical' && interview.meeting_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1" /> Join {PLATFORM_LABELS[interview.location_platform] || 'Meeting'}
                      </a>
                    </Button>
                  )}

                  {/* Add to Calendar */}
                  {interview.interview_date && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add to Calendar</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={googleCalendarUrl(interview, interview.job?.title || 'Interview')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <CalendarPlus className="h-4 w-4 mr-1" /> Google Calendar
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadICS(interview, interview.job?.title || 'Interview')}
                        >
                          <CalendarPlus className="h-4 w-4 mr-1" /> Apple / Outlook (.ics)
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Outcome and HR Notes — always shown after interview is scheduled */}
                  <div className="border-t pt-3 mt-3 space-y-3">
                    {/* Outcome card — always visible */}
                    <div className={`rounded-lg p-3 border ${
                      interview.outcome === 'pass'
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                        : interview.outcome === 'fail'
                          ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                          : 'bg-muted/40 border-border'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${
                        interview.outcome === 'pass' ? 'text-green-700 dark:text-green-400' :
                        interview.outcome === 'fail' ? 'text-red-700 dark:text-red-400' :
                        'text-muted-foreground'
                      }`}>Interview Outcome</p>
                      <p className={`text-sm font-bold mt-0.5 ${
                        interview.outcome === 'pass' ? 'text-green-600' :
                        interview.outcome === 'fail' ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                        {interview.outcome === 'pass' ? '✓ Passed' :
                         interview.outcome === 'fail' ? '✗ Did not pass' :
                         '⏳ Awaiting Decision'}
                      </p>
                    </div>

                    {/* HR Notes */}
                    {interview.feedback && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">HR Notes</p>
                        <p className="text-sm text-foreground leading-relaxed">{interview.feedback}</p>
                      </div>
                    )}
                  </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Interviews;
