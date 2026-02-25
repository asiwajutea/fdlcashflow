import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, CheckCircle, Briefcase, ArrowLeft, MapPin, Info, Building2, FileText, Star, DollarSign, Globe } from 'lucide-react';

const Apply = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [phone, setPhone] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) { setLoading(false); return; }
      const { data, error } = await (supabase as any)
        .from('job_positions')
        .select('*')
        .eq('id', jobId)
        .single();
      if (!error && data) setJob(data);
      setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !jobId) return;
    setSubmitting(true);

    try {
      let resumeUrl: string | null = null;
      if (resumeFile) {
        const filePath = `${user.id}/${Date.now()}_${resumeFile.name}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, resumeFile);
        if (uploadError) throw new Error('Failed to upload resume: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
        resumeUrl = urlData.publicUrl;
      }

      const { data: existingCandidate } = await (supabase as any)
        .from('candidates').select('id').eq('user_id', user.id).maybeSingle();

      let candidateId: string;
      if (existingCandidate) {
        candidateId = existingCandidate.id;
        await (supabase as any).from('candidates').update({
          phone: phone || undefined, education: education || undefined,
          experience_summary: experience || undefined, resume_url: resumeUrl || undefined,
        }).eq('id', candidateId);
      } else {
        const { data: newCandidate, error: candidateError } = await (supabase as any)
          .from('candidates').insert({
            user_id: user.id, phone, education,
            experience_summary: experience, resume_url: resumeUrl,
          }).select('id').single();
        if (candidateError) throw candidateError;
        candidateId = newCandidate.id;
      }

      const { error: appError } = await (supabase as any)
        .from('applications').insert({ candidate_id: candidateId, job_id: jobId, cover_letter: coverLetter });
      if (appError) throw appError;

      setSubmitted(true);
      toast({ title: 'Application Submitted', description: 'Your application has been received successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const locationText = () => {
    if (!job) return null;
    const parts = [job.work_location_state, job.work_location_country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Apply">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!jobId || !job) {
    return (
      <DashboardLayout title="Apply">
        <Card className="max-w-lg mx-auto p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Job Selected</h3>
          <p className="text-muted-foreground mt-1">Please select a job from the listings page.</p>
          <Button className="mt-4" onClick={() => navigate('/jobs')}>View Jobs</Button>
        </Card>
      </DashboardLayout>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout title="Application Submitted">
        <Card className="max-w-lg mx-auto p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
          <h3 className="text-2xl font-bold text-foreground">Application Submitted!</h3>
          <p className="text-muted-foreground mt-2">
            Your application for <strong>{job.title}</strong> has been received. We'll be in touch.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" onClick={() => navigate('/jobs')}>View More Jobs</Button>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Apply for Position">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Scrollable Job Details with Accordion */}
          <div className="lg:w-7/12 space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg">
              {job.media_url ? (
                <div className="h-56 overflow-hidden">
                  <img src={job.media_url} alt={job.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-primary/30" />
                </div>
              )}
              <CardContent className="p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.department && <Badge variant="secondary" className="text-sm">{job.department}</Badge>}
                    {job.job_type && <Badge variant="outline" className="text-sm">{job.job_type}</Badge>}
                    {locationText() && (
                      <Badge variant="outline" className="text-sm gap-1">
                        <MapPin className="h-3 w-3" /> {locationText()}
                      </Badge>
                    )}
                  </div>
                </div>

                <Accordion type="single" collapsible defaultValue="description" className="w-full">
                  {job.description && (
                    <AccordionItem value="description">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" /> Job Description
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.description}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {job.key_responsibilities && (
                    <AccordionItem value="responsibilities">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-primary" /> Key Responsibilities
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.key_responsibilities}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {job.requirements && (
                    <AccordionItem value="requirements">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" /> Requirements
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.requirements}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {job.compensation && (
                    <AccordionItem value="compensation">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" /> Compensation
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{job.compensation}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {locationText() && (
                    <AccordionItem value="location">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" /> Work Location
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{locationText()}</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sticky Application Form */}
          <div className="lg:w-5/12">
            <div className="lg:sticky lg:top-24">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Your Application
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className="mt-1" />
                    </div>
                    <div>
                      <Label>Education</Label>
                      <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. BSc Computer Science" className="mt-1" />
                    </div>
                    <div>
                      <Label>Experience Summary</Label>
                      <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Briefly describe your relevant experience..." className="mt-1" rows={3} />
                    </div>
                    <div>
                      <Label>Cover Letter</Label>
                      <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you interested in this position?" className="mt-1" rows={4} />
                    </div>
                    <div>
                      <Label>Resume (Optional)</Label>
                      <div className="mt-1">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-md bg-primary/5 border border-primary/10">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            Uploading a resume <strong>significantly increases</strong> your chances of being hired.
                          </p>
                        </div>
                        {resumeFile && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Upload className="h-3 w-3" /> {resumeFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Apply;
