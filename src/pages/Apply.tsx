import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// ─── Education levels ─────────────────────────────────────────────────────────
const EDUCATION_LEVELS = [
  { value: 'no_formal',        label: 'No Formal Education' },
  { value: 'primary',          label: 'Primary School' },
  { value: 'junior_secondary', label: 'Junior Secondary (JSS 3 / Middle School)' },
  { value: 'senior_secondary', label: 'Senior Secondary (WAEC / NECO / GCE)' },
  { value: 'vocational',       label: 'Vocational / Trade Certificate' },
  { value: 'nd',               label: 'National Diploma (ND)' },
  { value: 'hnd',              label: 'Higher National Diploma (HND)' },
  { value: 'university',       label: "Bachelor's Degree (B.Sc / B.A / B.Eng etc.)" },
  { value: 'postgraduate',     label: "Postgraduate Degree (M.Sc / MBA / M.A etc.)" },
  { value: 'doctorate',        label: 'Doctorate (PhD / DPhil)' },
  { value: 'professional',     label: 'Professional Certification (ACCA, ICAN, PMP etc.)' },
];

// Levels where a specific field/course input is relevant
const LEVELS_WITH_FIELD = new Set(['nd','hnd','university','postgraduate','doctorate','professional','vocational']);

const Apply = () => {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const jobId             = searchParams.get('jobId');
  const { toast }         = useToast();
  const { user, loading: authLoading } = useAuth();
  const topRef            = useRef<HTMLDivElement>(null);

  const [job, setJob]               = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // Form fields
  const [phone, setPhone]                   = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [educationField, setEducationField] = useState('');
  const [experience, setExperience]         = useState('');
  const [coverLetter, setCoverLetter]       = useState('');
  const [resumeFile, setResumeFile]         = useState<File | null>(null);

  const showEducationField = LEVELS_WITH_FIELD.has(educationLevel);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Load job
  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    (supabase as any).from('job_positions').select('*').eq('id', jobId).single()
      .then(({ data, error }: any) => { if (!error && data) setJob(data); setLoading(false); });
  }, [jobId]);

  // Restore draft + auto-submit after login
  useEffect(() => {
    if (authLoading) return; // wait for auth to fully resolve
    if (!user) return;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.jobId !== jobId) return;
      sessionStorage.removeItem(DRAFT_KEY);
      // Pre-fill form
      setPhone(draft.phone || '');
      setEducationLevel(draft.educationLevel || '');
      setEducationField(draft.educationField || '');
      setExperience(draft.experience || '');
      setCoverLetter(draft.coverLetter || '');
      // Auto-submit with a small delay to ensure job data is loaded
      const trySubmit = () => {
        submitApplication({
          phone: draft.phone,
          education: buildEducationString(draft.educationLevel, draft.educationField),
          experience: draft.experience,
          coverLetter: draft.coverLetter,
          resumeUrl: null,
        });
      };
      if (job) {
        trySubmit();
      } else {
        // Job not loaded yet — wait for it
        const interval = setInterval(() => {
          if (job) { clearInterval(interval); trySubmit(); }
        }, 200);
        setTimeout(() => clearInterval(interval), 5000);
      }
    } catch { sessionStorage.removeItem(DRAFT_KEY); }
  }, [user, authLoading, job]);

  const buildEducationString = (level: string, field: string) => {
    const levelLabel = EDUCATION_LEVELS.find(e => e.value === level)?.label || level;
    return field ? `${levelLabel} — ${field}` : levelLabel;
  };

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
            user_id: user.id, phone: data.phone, education: data.education,
            experience_summary: data.experience, resume_url: resumeUrl,
          }).select('id').single();
        if (cErr) throw cErr;
        candidateId = newC.id;
      }
      const { error: appErr } = await (supabase as any)
        .from('applications').insert({ candidate_id: candidateId, job_id: jobId, cover_letter: data.coverLetter });
      if (appErr) throw appErr;
      setSubmitted(true);
      toast({ title: 'Application Submitted!', description: "We'll be in touch soon." });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!phone.trim())        { toast({ title: 'Phone number is required', variant: 'destructive' }); return; }
    if (!educationLevel)      { toast({ title: 'Please select your highest education level', variant: 'destructive' }); return; }
    if (!experience.trim())   { toast({ title: 'Experience summary is required', variant: 'destructive' }); return; }
    if (!coverLetter.trim())  { toast({ title: 'Cover letter is required', variant: 'destructive' }); return; }

    const education = buildEducationString(educationLevel, educationField);

    if (!user) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ jobId, phone, educationLevel, educationField, experience, coverLetter }));
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

  if (loading || authLoading) return <PublicLayout><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading…</div></PublicLayout>;

  if (!jobId || !job) return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Job Selected</h3>
        <p className="text-muted-foreground mt-1">Please select a job from the listings page.</p>
        <Button className="mt-4" asChild><Link to="/careers">View Jobs</Link></Button>
      </div>
    </PublicLayout>
  );

  if (submitted) return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Application Submitted!</h3>
        <p className="text-muted-foreground mt-2">Your application for <strong>{job.title}</strong> has been received. We'll be in touch soon.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" asChild><Link to="/careers">View More Jobs</Link></Button>
          <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
        </div>
      </div>
    </PublicLayout>
  );

  return (
    <PublicLayout>
      {/* Scroll anchor at the very top */}
      <div ref={topRef} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        <Link to="/careers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Job Details */}
          <div className="lg:w-7/12 space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg">
              {job.media_url ? (
                <div className="h-36 sm:h-56 overflow-hidden"><img src={job.media_url} alt={job.title} className="w-full h-full object-cover" /></div>
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
                    {locationText() && <Badge variant="outline" className="text-sm gap-1"><MapPin className="h-3 w-3" /> {locationText()}</Badge>}
                  </div>
                </div>
                <Accordion type="single" collapsible defaultValue="description" className="w-full">
                  {job.description && (<AccordionItem value="description"><AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Job Description</span></AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.description}</p></AccordionContent></AccordionItem>)}
                  {job.key_responsibilities && (<AccordionItem value="responsibilities"><AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline"><span className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Key Responsibilities</span></AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.key_responsibilities}</p></AccordionContent></AccordionItem>)}
                  {job.requirements && (<AccordionItem value="requirements"><AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline"><span className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Requirements</span></AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.requirements}</p></AccordionContent></AccordionItem>)}
                  {job.compensation && (<AccordionItem value="compensation"><AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline"><span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Compensation</span></AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground">{job.compensation}</p></AccordionContent></AccordionItem>)}
                  {locationText() && (<AccordionItem value="location"><AccordionTrigger className="text-sm font-semibold uppercase tracking-wide hover:no-underline"><span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Work Location</span></AccordionTrigger><AccordionContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /><span>{locationText()}</span></div></AccordionContent></AccordionItem>)}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <div className="lg:w-5/12">
            <div className="lg:sticky lg:top-24">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Your Application</CardTitle>
                  {!user && <p className="text-xs text-muted-foreground mt-1">Fill in your details. You'll create a free account when you submit.</p>}
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Phone — required */}
                    <div>
                      <Label>Phone Number <span className="text-destructive">*</span></Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234..." className="mt-1" required />
                    </div>

                    {/* Education level — required */}
                    <div>
                      <Label>Highest Level of Education <span className="text-destructive">*</span></Label>
                      <Select value={educationLevel} onValueChange={v => { setEducationLevel(v); setEducationField(''); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select your highest qualification…" /></SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field of study — only shown for higher levels */}
                    {showEducationField && (
                      <div>
                        <Label>Field / Course of Study</Label>
                        <Input
                          value={educationField}
                          onChange={e => setEducationField(e.target.value)}
                          placeholder="e.g. BSc Software Development, HND Accounting…"
                          className="mt-1"
                        />
                      </div>
                    )}

                    {/* Experience — required */}
                    <div>
                      <Label>Experience Summary <span className="text-destructive">*</span></Label>
                      <Textarea value={experience} onChange={e => setExperience(e.target.value)} placeholder="Briefly describe your relevant experience…" className="mt-1" rows={3} required />
                    </div>

                    {/* Cover letter — required */}
                    <div>
                      <Label>Cover Letter <span className="text-destructive">*</span></Label>
                      <Textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Why are you interested in this position?" className="mt-1" rows={4} required />
                    </div>

                    {/* Resume/CV — optional */}
                    <div>
                      <Label>Resume / CV <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setResumeFile(e.target.files?.[0] || null)} className="mt-1 cursor-pointer" />
                      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-md bg-primary/5 border border-primary/10">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">Uploading a Resume/CV <strong>significantly increases</strong> your chances of being shortlisted.</p>
                      </div>
                      {resumeFile && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Upload className="h-3 w-3" /> {resumeFile.name}</p>}
                    </div>

                    {/* Submit */}
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
                          <button type="button" className="text-primary hover:underline" onClick={() => {
                            sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ jobId, phone, educationLevel, educationField, experience, coverLetter }));
                            navigate(`/auth?mode=login&redirect=${encodeURIComponent(`/apply?jobId=${jobId}`)}`);
                          }}>Sign in</button>
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
