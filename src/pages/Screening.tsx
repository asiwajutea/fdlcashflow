import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Loader2, ClipboardList } from 'lucide-react';
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
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

    if (!data) {
      setLoading(false);
      return;
    }

    setScreening(data);
    const responses = data.responses as any;
    if (responses?.answers && Object.keys(responses.answers).length > 0) {
      setSubmitted(true);
      setAnswers(responses.answers);
      setScore(data.score);
      setFeedback(responses.feedback || null);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!screening) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('score-screening', {
        body: { application_id: applicationId, answers },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setScore(data.score);
      setFeedback(data.feedback);
      setSubmitted(true);
      toast({ title: 'Submitted!', description: `Your screening has been scored: ${data.score}/100` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to submit screening', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceRecording = (questionId: string, audioUrl: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId] || '';
      // Remove any existing audio:: prefix
      const textPart = existing.split('\n').filter((l) => !l.startsWith('audio::')).join('\n').trim();
      if (!audioUrl) return { ...prev, [questionId]: textPart };
      const newValue = textPart ? `${textPart}\naudio::${audioUrl}` : `audio::${audioUrl}`;
      return { ...prev, [questionId]: newValue };
    });
  };

  const getTextPart = (answer: string) => {
    return answer?.split('\n').filter((l) => !l.startsWith('audio::')).join('\n').trim() || '';
  };

  const getAudioUrl = (answer: string) => {
    const line = answer?.split('\n').find((l) => l.startsWith('audio::'));
    return line ? line.replace('audio::', '') : '';
  };

  const questions = (screening?.responses as any)?.questions || [];

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Screening">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
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
        {submitted && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <h3 className="text-lg font-semibold">Screening Completed</h3>
              {score !== null && (
                <Badge variant="secondary" className="mt-2 text-lg px-4 py-1">
                  Score: {score}/100
                </Badge>
              )}
              {feedback && <p className="text-sm text-muted-foreground mt-3">{feedback}</p>}
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
                      const newVal = audio ? `${e.target.value}\naudio::${audio}` : e.target.value;
                      setAnswers((prev) => ({ ...prev, [q.id]: newVal }));
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
          <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Scoring your responses...
              </>
            ) : (
              'Submit Screening'
            )}
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Screening;
