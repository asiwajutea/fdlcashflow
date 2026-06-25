import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
import PublicLayout from '@/components/PublicLayout';
import {
  Upload, CheckCircle, Briefcase, ArrowLeft, MapPin, Info,
  Building2, FileText, Star, DollarSign, Globe, LogIn,
} from 'lucide-react';

const DRAFT_KEY = 'fdl_application_draft';

const Apply = () => {
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId       = searchParams.get('jobId');
  const { toast }   = useToast();
  const { user, loading: authLoading } = useAuth();

  const [job, setJob]               = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // Form fields
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile]   = useState<File | null>(null);
  const [phone, setPhone]             = useState('');
  const [education, setEducation]     = useState('');
  const [experience, setExperience]   = useState('');

  // Load job details
  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    (supabase as any).from('job_positions').select('*').eq('id', jobId).single()
      .then(({ data, error }: any) => { if (!error && data) setJob(data); setLoading(false); });
  }, [jobId]);

  // After login/signup: check if there's a pending draft and auto-submit
  useEffect(() => {
    if (authLoading || !user) return;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.jobId !== jobId) return; // different job, skip
      sessionStorage.removeItem(DRAFT_KEY);
      // Pre-fill form from draft
      setPhone(draft.phone || '');
      setEducation(draft.education || '');
      setExperience(draft.experience || '');
      setCoverLetter(draft.coverLetter || '');
      // Auto-submit
      submitApplication({
        phone: draft.phone, education: draft.education,
        experience: draft.experience, coverLetter: draft.coverLetter,
        resumeUrl: null, // file can't survive sessionStorage — ask user to re-upload
      });
    } catch { sessionStorage.removeItem(DRAFT_KEY); }
  }, [user, authLoading]);

  const submitApplication = async (data: {
    phone: string; education: string; experience: string;
    coverLetter: string; resumeUrl: string | null;
  }) => {
    if (!user || !jobId) return;
    setSubmitting(true);
    try {
      let resumeUrl = data.resumeUrl;
      if (resumeFile) {
        const path = `${user.id}/${Date.now()}_${resumeFile.name}`;
        const { error: upErr } = await supabase.storage.from('resumes').upload(path, resumeFile);
        if (upErr) throw upErr;
        resumeUrl = supabase.storage.from('resumes').getPublicUrl(path).data.publicUrl;
      }

      const { data: existing } = await (supabase as any)
        .from('candidates').select('id').eq('user_id', user.id).maybeSingle();

      let candidateId: string;
      if (existing) {
        candidateId = existing.id;
        await (supabase as any).from('candidates').update({
          phone: data.phone || undefined,
          education: data.education || undefined,
          experience_summary: data.experience || undefined,
          resume_url: resumeUrl || undefined,
        }).eq('id', candidateId);
      } else {
        const { data: newC, error: cErr } = await (supabase as any)
          .from('candidates').insert({
            user_id: user.id,
            phone: data.phone,
            education: data.education,
            experience_summary: data.experience,
            resume_url: resumeUrl,
          }).select('id').single();
        if (cErr) throw cErr;
        candidateId = newC.id;
      }

      const { error: appErr } = await (supabase as any)
        .from('applications').insert({
          candidate_id: candidateId,
          job_id: jobId,
          cover_letter: data.coverLetter,
        });
      if (appErr) throw appErr;

      setSubmitted(true);
      toast({ title: 'Application Submitted!', description: 'We\'ll be in touch soon.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Not logged in — save draft and redirect to signup
    if (!user) {
      const draft = { jobId, phone, education, experience, coverLetter };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      navigate(`/auth?mode=signup&role=candidate&redirect=${encodeURIComponent(`/apply?jobId=${jobId}`)}`);
      return;
    }

    await submitApplication({ phone, education, experience, coverLetter, resumeUrl: null });
  };

  const locationText = () => {
    if (!job) return null;
    const parts = [job.work_location_state, job.work_location_country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading…</div>
      </PublicLayout>
    );
  }

  // ── No job found ──────────────────────────────────────────────────────────
  if (!jobId || !job) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Job Selected</h3>
          <p className="text-muted-foreground mt-1">Please select a job from the listings page.</p>
          <Button className="mt-4" asChild><Link to="/careers">View Jobs</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  // ── Submitted ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
          <h3 className="text-2xl font-bold">Application Submitted!</h3>
          <p className="text-muted-foreground mt-2">
            Your application for <strong>{job.title}</strong> has been received. We'll be in touch soon.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" asChild><Link to="/careers">View More Jobs</Link></Button>
            <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ── Main apply page ────────────────────────────────────────────────────────
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left: Job Details ── */}
          <div className="lg:w-7/12 space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg">
              {job.media_url ? (
                <div className="h-36 sm:h-56 overflow-hidden">
                  <img src={job.media_url} alt={job.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-28 sm:h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
                  <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary/30" />
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
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Job Description</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.description}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {job.key_responsibilities && (
                    <AccordionItem value="responsibilities">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Key Responsibilities</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.key_responsibilities}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {job.requirements && (
                    <AccordionItem value="requirements">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Requirements</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.requirements}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {job.compensation && (
                    <AccordionItem value="compensation">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Compensation</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{job.compensation}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {locationText() && (
                    <AccordionItem value="location">
                      <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline">
                        <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Work Location</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" /><span>{locationText()}</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Application Form ── */}
          <div className="lg:w-5/12">
            <div className="lg:sticky lg:top-24">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Your Application
                  </CardTitle>
                  {!user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Fill in your details below. You'll create a free account when you submit — your answers will be saved automatically.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="mt-1" />
                    </div>
                    <div>
                      <Label>Education</Label>
                      <Input value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. BSc Computer Science" className="mt-1" />
                    </div>
                    <div>
                      <Label>Experience Summary</Label>
                      <Textarea value={experience} onChange={e => setExperience(e.target.value)} placeholder="Briefly describe your relevant experience…" className="mt-1" rows={3} />
                    </div>
                    <div>
                      <Label>Cover Letter</Label>
                      <Textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Why are you interested in this position?" className="mt-1" rows={4} />
                    </div>
                    <div>
                      <Label>Resume <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files?.[0] || null)} className="mt-1 cursor-pointer" />
                      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-md bg-primary/5 border border-primary/10">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Uploading a resume <strong>significantly increases</strong> your chances of being shortlisted.
                        </p>
                      </div>
                      {resumeFile && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Upload className="h-3 w-3" /> {resumeFile.name}</p>}
                    </div>

                    {/* CTA — changes based on auth state */}
                    {user ? (
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Submit Application'}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button type="submit" className="w-full gap-2" disabled={submitting}>
                          <LogIn className="h-4 w-4" />
                          {submitting ? 'Saving…' : 'Submit — Create Free Account'}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          Already have an account?{' '}
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                              const draft = { jobId, phone, education, experience, coverLetter };
                              sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                              navigate(`/auth?mode=login&redirect=${encodeURIComponent(`/apply?jobId=${jobId}`)}`);
                            }}
                          >
                            Sign in
                          </button>
                        </p>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Apply;
