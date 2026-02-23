import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, CheckCircle, Briefcase } from 'lucide-react';

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
      if (!jobId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
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
      // 1. Upload resume if provided
      let resumeUrl: string | null = null;
      if (resumeFile) {
        const filePath = `${user.id}/${Date.now()}_${resumeFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resumeFile);

        if (uploadError) throw new Error('Failed to upload resume: ' + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);
        resumeUrl = urlData.publicUrl;
      }

      // 2. Upsert candidate record
      const { data: existingCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let candidateId: string;

      if (existingCandidate) {
        candidateId = existingCandidate.id;
        // Update candidate info
        await supabase
          .from('candidates')
          .update({
            phone: phone || undefined,
            education: education || undefined,
            experience_summary: experience || undefined,
            resume_url: resumeUrl || undefined,
          })
          .eq('id', candidateId);
      } else {
        const { data: newCandidate, error: candidateError } = await supabase
          .from('candidates')
          .insert({
            user_id: user.id,
            phone,
            education,
            experience_summary: experience,
            resume_url: resumeUrl,
          })
          .select('id')
          .single();

        if (candidateError) throw candidateError;
        candidateId = newCandidate.id;
      }

      // 3. Create application
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          cover_letter: coverLetter,
        });

      if (appError) throw appError;

      setSubmitted(true);
      toast({ title: 'Application Submitted', description: 'Your application has been received successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Job Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {job.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{job.department}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{job.description}</p>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Application</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you interested in this position?" className="mt-1" rows={5} />
              </div>
              <div>
                <Label>Resume (PDF)</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
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
    </DashboardLayout>
  );
};

export default Apply;
