import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Eye, FileText, ExternalLink, Brain, Calendar, Upload, Loader2 } from 'lucide-react';
import ScreeningViewDialog from '@/components/hr/ScreeningViewDialog';
import InterviewScheduleDialog from '@/components/hr/InterviewScheduleDialog';
import ContractUploadDialog from '@/components/hr/ContractUploadDialog';

interface ApplicationRow {
  id: string;
  cover_letter: string | null;
  status: string;
  applied_at: string;
  candidate: {
    id: string;
    phone: string | null;
    education: string | null;
    experience_summary: string | null;
    resume_url: string | null;
    user_id: string;
  };
  job: {
    id: string;
    title: string;
    department: string;
    description: string;
    requirements: string;
  };
  candidate_name: string | null;
  screening_score?: number | null;
}

const STATUS_OPTIONS = ['submitted', 'screening', 'interview', 'offered', 'hired', 'rejected'];

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'hired': return 'default';
    case 'rejected': return 'destructive';
    case 'interview':
    case 'offered': return 'secondary';
    default: return 'outline';
  }
};

// Stage message templates
const STAGE_MESSAGES: Record<string, { subject: string; body: (jobTitle: string) => string }> = {
  screening: {
    subject: 'Your application has moved to Screening',
    body: (jobTitle) => `Dear Candidate,\n\nGreat news! Your application for the "${jobTitle}" position has been selected for screening.\n\nPlease complete the screening questionnaire at your earliest convenience. This is an important step in our evaluation process.\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  interview: {
    subject: 'Interview Scheduled — Congratulations!',
    body: (jobTitle) => `Dear Candidate,\n\nCongratulations! You've been shortlisted for an interview for the "${jobTitle}" position.\n\nPlease check your interview details in the Interviews section of your dashboard. Make sure to prepare and be available at the scheduled time.\n\nWe look forward to meeting you!\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  offered: {
    subject: 'Job Offer Extended — Action Required',
    body: (jobTitle) => `Dear Candidate,\n\nWe are pleased to extend an offer for the "${jobTitle}" position!\n\nPlease review and sign your contract in the Offers section of your dashboard. If you have any questions, don't hesitate to reach out.\n\nWelcome aboard!\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
  hired: {
    subject: 'Welcome to the Team! 🎉',
    body: (jobTitle) => `Dear Colleague,\n\nWelcome aboard! You've been officially hired for the "${jobTitle}" position.\n\nWe're excited to have you join our team at Footprints Dynasty Limited. Further onboarding details will be shared with you shortly.\n\nCongratulations!\n\nBest regards,\nHR Team\nFootprints Dynasty Limited`,
  },
};

const Applications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading, hasCapability } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [screeningAppId, setScreeningAppId] = useState<string | null>(null);
  const [interviewAppId, setInterviewAppId] = useState<string | null>(null);
  const [contractAppId, setContractAppId] = useState<string | null>(null);
  const [generatingScreening, setGeneratingScreening] = useState<string | null>(null);

  const canManageRecruitment = role === 'admin' || hasCapability('manage_recruitment');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && user && !canManageRecruitment) navigate('/dashboard');
  }, [user, authLoading, canManageRecruitment, navigate]);

  useEffect(() => {
    if (canManageRecruitment) fetchApplications();
  }, [canManageRecruitment]);

  const fetchApplications = async () => {
    const { data, error } = await (supabase as any)
      .from('applications')
      .select(`
        id, cover_letter, status, applied_at,
        candidates!inner(id, phone, education, experience_summary, resume_url, user_id),
        job_positions!inner(id, title, department, description, requirements)
      `)
      .order('applied_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((a: any) => a.candidates.user_id))];
    const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', userIds);
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

    const appIds = (data || []).map((a: any) => a.id);
    let scoreMap = new Map<string, number | null>();
    if (appIds.length > 0) {
      const { data: screeningData } = await (supabase as any)
        .from('screening_responses')
        .select('application_id, score')
        .in('application_id', appIds);
      scoreMap = new Map(screeningData?.map((s: any) => [s.application_id, s.score]) || []);
    }

    const mapped: ApplicationRow[] = (data || []).map((a: any) => ({
      id: a.id,
      cover_letter: a.cover_letter,
      status: a.status,
      applied_at: a.applied_at,
      candidate: a.candidates,
      job: a.job_positions,
      candidate_name: profileMap.get(a.candidates.user_id) || 'Unknown',
      screening_score: scoreMap.get(a.id) ?? null,
    }));

    setApplications(mapped);
    setLoading(false);
  };

  const triggerScreeningGeneration = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    setGeneratingScreening(appId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-screening', {
        body: {
          job_title: app.job.title,
          department: app.job.department,
          description: app.job.description,
          requirements: app.job.requirements,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await (supabase as any).from('screening_responses').insert({
        application_id: appId,
        responses: { questions: data.questions, answers: {}, generated_at: new Date().toISOString() },
      });

      toast({ title: 'Screening Generated', description: 'AI screening questions created successfully.' });
    } catch (e: any) {
      toast({ title: 'Screening Error', description: e.message || 'Failed to generate screening questions', variant: 'destructive' });
    } finally {
      setGeneratingScreening(null);
    }
  };

  const sendStageMessage = async (app: ApplicationRow, newStatus: string) => {
    const template = STAGE_MESSAGES[newStatus];
    if (!template || !user) return;

    try {
      await (supabase as any).from('messages').insert({
        sender_id: user.id,
        recipient_id: app.candidate.user_id,
        subject: template.subject,
        body: template.body(app.job.title),
      });
    } catch (e) {
      console.error('Failed to send stage message:', e);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const app = applications.find(a => a.id === appId);
    const { error } = await (supabase as any).from('applications').update({ status: newStatus }).eq('id', appId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Status Updated', description: `Application moved to "${newStatus}"` });
    setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status: newStatus } : a)));

    // Send stage message + SMS to candidate
    if (app) {
      sendStageMessage(app, newStatus);
      try {
        const { data: prof } = await (supabase as any).from('profiles').select('full_name, phone').eq('id', app.candidate.user_id).maybeSingle();
        if (prof?.phone) {
          supabase.functions.invoke('send-sms', {
            body: {
              to: prof.phone, user_id: app.candidate.user_id,
              template_key: newStatus === 'hired' ? 'candidate_hire' : 'candidate_stage',
              vars: {
                name: (prof.full_name || 'there').split(' ')[0],
                job: app.job.title, stage: newStatus, position: app.job.title,
              },
            },
          }).catch(() => {});
        }
      } catch (e) { console.error('candidate sms', e); }
    }

    if (newStatus === 'screening') {
      triggerScreeningGeneration(appId);
    }

    if (newStatus === 'hired') {
      try {
        const { error: promoteErr } = await supabase.functions.invoke('promote-candidate-to-employee', {
          body: { application_id: appId },
        });
        if (promoteErr) throw promoteErr;
        toast({ title: 'Promoted to Employee', description: 'Candidate role updated and employee record linked.' });
      } catch (e: any) {
        toast({ title: 'Promotion Failed', description: e.message || 'Could not promote candidate', variant: 'destructive' });
      }
    }
  };

  const viewDetails = (app: ApplicationRow) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Applications">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="HR Applications Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Applications
            </h2>
            <p className="text-muted-foreground">
              {applications.length} total application{applications.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/jobs')}>
            View Job Listings
          </Button>
        </div>

        {applications.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Applications Yet</h3>
            <p className="text-muted-foreground">Applications will appear here when candidates apply.</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.candidate_name}</TableCell>
                    <TableCell>{app.job.title}</TableCell>
                    <TableCell>{app.job.department}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                          <SelectTrigger className="w-[130px]">
                            <Badge variant={statusVariant(app.status)} className="text-xs">
                              {app.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {app.screening_score != null && (
                          <Badge variant="secondary" className="text-xs">{app.screening_score}/100</Badge>
                        )}
                        {generatingScreening === app.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => viewDetails(app)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(app.status === 'screening' || app.screening_score != null) && (
                          <Button size="sm" variant="ghost" onClick={() => setScreeningAppId(app.id)} title="View Screening">
                            <Brain className="h-4 w-4" />
                          </Button>
                        )}
                        {app.status === 'interview' && (
                          <Button size="sm" variant="ghost" onClick={() => setInterviewAppId(app.id)} title="Manage Interview">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                        {app.status === 'offered' && (
                          <Button size="sm" variant="ghost" onClick={() => setContractAppId(app.id)} title="Manage Contract">
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Candidate</p>
                    <p className="font-medium">{selectedApp.candidate_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedApp.job.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedApp.candidate.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Education</p>
                    <p className="font-medium">{selectedApp.candidate.education || 'N/A'}</p>
                  </div>
                </div>
                {selectedApp.candidate.experience_summary && (
                  <div>
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-sm">{selectedApp.candidate.experience_summary}</p>
                  </div>
                )}
                {selectedApp.cover_letter && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cover Letter</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedApp.cover_letter}</p>
                  </div>
                )}
                {selectedApp.candidate.resume_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedApp.candidate.resume_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> View Resume
                    </a>
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ScreeningViewDialog applicationId={screeningAppId} open={!!screeningAppId} onOpenChange={(o) => !o && setScreeningAppId(null)} />
        <InterviewScheduleDialog applicationId={interviewAppId} open={!!interviewAppId} onOpenChange={(o) => !o && setInterviewAppId(null)} onSaved={fetchApplications} />
        <ContractUploadDialog applicationId={contractAppId} open={!!contractAppId} onOpenChange={(o) => !o && setContractAppId(null)} onSaved={fetchApplications} />
      </div>
    </DashboardLayout>
  );
};

export default Applications;
