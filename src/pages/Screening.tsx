import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Loader2, ClipboardList, Save } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';

const Screening = () => {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [screening, setScreening] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs so auto-save closure always reads latest values
  const screeningRef = useRef<any>(null);
  const answersRef   = useRef<Record<string, string>>({});
  useEffect(() => { screeningRef.current = screening; }, [screening]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (applicationId && user) fetchScreening();
  }, [applicationId, user]);

  const fetchScreening = async () => {
    const { data, error } = await supabase
      .from('screening_responses')
      .select('*')
      .eq('application_id', applicationId!)
      .maybeSingle();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (!data) { setLoading(false); return; }

    setScreening(data);
    const responses = data.responses as any;
    if (responses?.answers && Object.keys(responses.answers).length > 0) {
      // Restore all saved answers — including drafts not yet submitted
      setAnswers(responses.answers);
      if (responses?.submitted_at) {
        setSubmitted(true);
      }
      if (responses?.last_saved_at) {
        setLastSaved(new Date(responses.last_saved_at));
      }
    }
    setLoading(false);
  };

  // Auto-save candidate answers (silent, uses refs to avoid stale closures)
  const performAutoSave = useCallback(async () => {
    const sc = screeningRef.current;
    const ans = answersRef.current;
    if (!sc || Object.keys(ans).length === 0) return;
    setAutoSaving(true);
    const updatedResponses = { ...(sc.responses as any), answers: ans, last_saved_at: new Date().toISOString() };
    const { error } = await (supabase as any)
      .from('screening_responses')
      .update({ responses: updatedResponses })
      .eq('id', sc.id);
    if (!error) {
      setLastSaved(new Date());
      setScreening((prev: any) => prev ? { ...prev, responses: updatedResponses } : prev);
    }
    setAutoSaving(false);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => performAutoSave(), 1500);
  }, [performAutoSave]);

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const handleSubmit = async () => {
    if (!screening) return;
    setSubmitting(true);

    try {
      // Step 1: Save answers immediately — this always works regardless of AI credit.
      const updatedResponses = {
        ...(screening.responses as any),
        answers,
        submitted_at: new Date().toISOString(),
      };
      const { error: saveErr } = await (supabase as any)
        .from('screening_responses')
        .update({ responses: updatedResponses })
        .eq('id', screening.id);
      if (saveErr) throw saveErr;

      setSubmitted(true);

      // Step 2: Attempt AI scoring in the background — failure is non-blocking.
      // Candidates never see the score; HR/admin can also score manually.
      supabase.functions.invoke('score-screening', {
        body: { application_id: applicationId, answers },
      }).catch(() => {
        // Silently swallow — score will be assigned manually by HR if AI is unavailable.
      });

      toast({
        title: 'Submitted successfully!',
        description: 'Your screening responses have been recorded. HR will be in touch soon.',
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to submit screening', variant: 'destructive' });
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceRecording = (questionId: string, audioUrl: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId] || '';
      const textPart = existing.split('\n').filter((l) => !l.startsWith('audio::')).join('\n').trim();
      if (!audioUrl) return { ...prev, [questionId]: textPart };
      return { ...prev, [questionId]: textPart ? `${textPart}\naudio::${audioUrl}` : `audio::${audioUrl}` };
    });
    scheduleAutoSave();
  };

  const getTextPart = (answer: string) =>
    answer?.split('\n').filter((l) => !l.startsWith('audio::')).join('\n') || '';

  const getAudioUrl = (answer: string) => {
    const line = answer?.split('\n').find((l) => l.startsWith('audio::'));
    return line ? line.replace('audio::', '') : '';
  };

  const questions = (screening?.responses as any)?.questions || [];

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Screening">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!applicationId) {
    return (
      <DashboardLayout title="Screening">
        <Card className="p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Application Specified</h3>
          <p className="text-muted-foreground">Please access this page from your application link.</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (!screening) {
    return (
      <DashboardLayout title="Screening">
        <Card className="p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Screening Available</h3>
          <p className="text-muted-foreground">Your screening questionnaire hasn't been generated yet. Please check back later.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Screening Questionnaire">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

        {/* Submission confirmation — no score or feedback shown to candidate */}
        {submitted && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <h3 className="text-lg font-semibold">Screening Completed</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your responses have been recorded. Our HR team will review them and get back to you.
              </p>
            </CardContent>
          </Card>
        )}

        {questions.map((q: any, idx: number) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Q{idx + 1}: {q.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === 'multiple_choice' && q.options ? (
                <RadioGroup
                  value={answers[q.id] || ''}
                  onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  disabled={submitted}
                >
                  {q.options.map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center space-x-2 py-1">
                      <RadioGroupItem value={opt} id={`${q.id}-${oi}`} />
                      <Label htmlFor={`${q.id}-${oi}`} className="text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div>
                  <Textarea
                    placeholder="Type your answer here..."
                    value={getTextPart(answers[q.id] || '')}
                    onChange={(e) => {
                      const audio = getAudioUrl(answers[q.id] || '');
                      // Preserve the full typed value including spaces — only re-attach the audio line
                      const newVal = audio ? `${e.target.value}\naudio::${audio}` : e.target.value;
                      setAnswers((prev) => ({ ...prev, [q.id]: newVal }));
                      scheduleAutoSave();
                    }}
                    onKeyDown={(e) => {
                      // Explicitly allow space key to prevent any browser/React stripping
                      if (e.key === ' ') e.stopPropagation();
                    }}
                    disabled={submitted}
                    rows={3}
                  />
                  <VoiceRecorder
                    onRecordingComplete={(url) => handleVoiceRecording(q.id, url)}
                    existingAudioUrl={getAudioUrl(answers[q.id] || '')}
                    disabled={submitted}
                  />
                  {submitted && getAudioUrl(answers[q.id] || '') && (
                    <audio controls src={getAudioUrl(answers[q.id] || '')} className="mt-2 w-full h-10" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!submitted && questions.length > 0 && (
          <div className="space-y-3">
            {/* Auto-save status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                {autoSaving
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving draft…</>
                  : lastSaved
                    ? <><Save className="h-3 w-3 text-emerald-500" /> Draft saved {lastSaved.toLocaleTimeString()}</>
                    : 'Answers auto-save as you type'}
              </span>
              <button
                type="button"
                onClick={() => performAutoSave()}
                disabled={autoSaving}
                className="underline hover:no-underline disabled:opacity-50"
              >
                Save draft now
              </button>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                'Submit Screening'
              )}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Screening;
