import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Video, CalendarPlus } from 'lucide-react';

// Generate a Google Calendar URL for an interview
function googleCalendarUrl(interview: any, jobTitle: string): string {
  if (!interview.interview_date) return '';
  const start = new Date(interview.interview_date);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const details = [
    interview.interviewer ? `Interviewer: ${interview.interviewer}` : '',
    interview.meeting_link ? `Meeting link: ${interview.meeting_link}` : '',
  ].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(`Interview: ${jobTitle}`)}`
    + `&dates=${fmt(start)}/${fmt(end)}`
    + `&details=${encodeURIComponent(details)}`
    + (interview.meeting_link ? `&location=${encodeURIComponent(interview.meeting_link)}` : '');
}

// Generate an .ics file download for Apple Calendar / Outlook
function downloadICS(interview: any, jobTitle: string) {
  if (!interview.interview_date) return;
  const start = new Date(interview.interview_date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `interview-${interview.id}@fdlworkforce`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FDL Workforce//Interview//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Interview: ${jobTitle}`,
    interview.interviewer ? `DESCRIPTION:Interviewer: ${interview.interviewer}` : '',
    interview.meeting_link ? `LOCATION:${interview.meeting_link}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `interview-${jobTitle.replace(/\s+/g, '-')}.ics`;
  a.click(); URL.revokeObjectURL(url);
}

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
                  {interview.meeting_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1" /> Join Meeting
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
                  {interview.feedback && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted-foreground">Feedback</p>
                      <p className="text-sm">{interview.feedback}</p>
                    </div>
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

export default Interviews;
