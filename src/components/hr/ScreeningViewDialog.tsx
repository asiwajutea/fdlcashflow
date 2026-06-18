import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw } from 'lucide-react';

interface ScreeningViewDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseAnswer = (answer: string) => {
  const lines = (answer || '').split('\n');
  const audioLine = lines.find((l) => l.startsWith('audio::'));
  const textLines = lines.filter((l) => !l.startsWith('audio::'));
  return {
    text: textLines.join('\n').trim(),
    audioUrl: audioLine ? audioLine.replace('audio::', '') : null,
  };
};

// Derive final percentage score from per-question scores
function deriveScore(questionScores: Record<string, number>, questionCount: number): number | null {
  if (!questionCount) return null;
  const values = Object.values(questionScores);
  if (!values.length) return null;
  const total = values.reduce((s, v) => s + Math.max(0, Math.min(10, v || 0)), 0);
  const max = questionCount * 10;
  return Math.round((total / max) * 100);
}

const ScreeningViewDialog: React.FC<ScreeningViewDialogProps> = ({ applicationId, open, onOpenChange }) => {
  const { toast } = useToast();
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  // Per-question scores: { [questionId]: number 0-10 }
  const [qScores, setQScores]     = useState<Record<string, string>>({});
  const [dirty, setDirty]         = useState(false);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setDirty(false);
    const { data: d } = await (supabase as any)
      .from('screening_responses')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    setData(d);
    // Restore any previously saved per-question scores
    const saved: Record<string, number> = d?.responses?.question_scores || {};
    const asStrings: Record<string, string> = {};
    Object.entries(saved).forEach(([k, v]) => { asStrings[k] = String(v); });
    setQScores(asStrings);
    setLoading(false);
  }, [applicationId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const responses   = data?.responses as any;
  const questions   = responses?.questions  || [];
  const answers     = responses?.answers    || {};
  const hasAnswers  = Object.keys(answers).length > 0;

  // Compute live preview of score as HR types
  const parsedScores: Record<string, number> = {};
  questions.forEach((q: any) => {
    const val = parseFloat(qScores[q.id] ?? '');
    if (!isNaN(val)) parsedScores[q.id] = Math.max(0, Math.min(10, val));
  });
  const scoredCount   = Object.keys(parsedScores).length;
  const liveTotal     = Object.values(parsedScores).reduce((s, v) => s + v, 0);
  const maxTotal      = questions.length * 10;
  const livePercent   = maxTotal > 0 ? Math.round((liveTotal / maxTotal) * 100) : null;

  // Final persisted score
  const savedPercent  = data?.score ?? null;

  const handleScoreChange = (qId: string, val: string) => {
    setQScores(prev => ({ ...prev, [qId]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!data) return;

    // Validate all scored questions are 0-10
    for (const [qId, val] of Object.entries(qScores)) {
      if (val === '' || val === undefined) continue;
      const n = parseFloat(val);
      if (isNaN(n) || n < 0 || n > 10) {
        toast({ title: 'Invalid score', description: `Each question must be scored 0–10.`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    const finalPercent = livePercent;
    const updatedResponses = {
      ...responses,
      question_scores: parsedScores,
      scored_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('screening_responses')
      .update({
        responses: updatedResponses,
        score: finalPercent,
      })
      .eq('id', data.id);

    if (error) {
      toast({ title: 'Error saving scores', description: error.message, variant: 'destructive' });
    } else {
      setData({ ...data, score: finalPercent, responses: updatedResponses });
      setDirty(false);
      toast({
        title: 'Scores saved',
        description: `Final score: ${finalPercent}% (${liveTotal}/${maxTotal} points)`,
      });
    }
    setSaving(false);
  };

  const handleReset = () => {
    const saved: Record<string, number> = data?.responses?.question_scores || {};
    const asStrings: Record<string, string> = {};
    Object.entries(saved).forEach(([k, v]) => { asStrings[k] = String(v); });
    setQScores(asStrings);
    setDirty(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Screening Results</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Score each answer out of 10. Final score = total ÷ max × 100%</p>
          </div>
          {savedPercent != null && (
            <Badge variant={savedPercent >= 70 ? 'default' : savedPercent >= 50 ? 'secondary' : 'destructive'} className="text-sm px-3 py-1">
              {savedPercent}%
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <p className="text-muted-foreground text-sm p-6">No screening data found.</p>
        ) : (
          <>
            {/* Score summary bar */}
            {questions.length > 0 && (
              <div className="px-6 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {scoredCount} of {questions.length} questions scored · {liveTotal}/{maxTotal} points
                  </span>
                  {livePercent != null && (
                    <span className={`text-sm font-bold ${livePercent >= 70 ? 'text-emerald-600' : livePercent >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                      {livePercent}%
                    </span>
                  )}
                </div>
                <Progress value={livePercent ?? 0} className="h-1.5" />
              </div>
            )}

            {/* AI feedback */}
            {responses?.feedback && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 shrink-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">AI Feedback</p>
                <p className="text-sm text-foreground">{responses.feedback}</p>
              </div>
            )}

            {/* Questions list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {!hasAnswers ? (
                <div className="text-center py-8">
                  <p className="text-sm text-amber-600 font-medium">Questions generated — awaiting candidate responses.</p>
                  <p className="text-xs text-muted-foreground mt-1">Scores can be entered once the candidate submits their answers.</p>
                </div>
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions found.</p>
              ) : (
                questions.map((q: any, idx: number) => {
                  const rawAnswer = answers[q.id] || '';
                  const { text, audioUrl } = parseAnswer(rawAnswer);
                  const scoreVal = qScores[q.id] ?? '';
                  const numericScore = parseFloat(scoreVal);
                  const isValid = scoreVal === '' || (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 10);
                  const scoreColor = !isValid ? 'border-destructive' : numericScore >= 8 ? 'border-emerald-400' : numericScore >= 5 ? 'border-amber-400' : numericScore >= 0 && scoreVal !== '' ? 'border-red-400' : '';

                  return (
                    <div key={q.id} className="rounded-xl border bg-card overflow-hidden">
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-muted/30 border-b">
                        <p className="text-sm font-semibold text-foreground flex-1 leading-snug">
                          Q{idx + 1}: {q.question}
                        </p>
                        {/* Per-question score input */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            value={scoreVal}
                            onChange={e => handleScoreChange(q.id, e.target.value)}
                            placeholder="—"
                            className={`h-8 w-16 text-center text-sm font-semibold ${scoreColor}`}
                            aria-label={`Score for question ${idx + 1}`}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">/ 10</span>
                        </div>
                      </div>

                      {/* Answer */}
                      <div className="px-4 py-3">
                        {text ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
                        ) : !audioUrl ? (
                          <p className="text-sm text-muted-foreground italic">No written answer provided</p>
                        ) : null}
                        {audioUrl && (
                          <audio controls src={audioUrl} className="w-full h-10 mt-2" />
                        )}
                        {!text && !audioUrl && (
                          null
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer action bar */}
            {hasAnswers && questions.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/10 shrink-0">
                <div className="text-sm text-muted-foreground">
                  {dirty && <span className="text-amber-600 font-medium">Unsaved changes</span>}
                  {!dirty && savedPercent != null && <span className="text-emerald-600 font-medium">Saved · {savedPercent}%</span>}
                  {!dirty && savedPercent == null && <span>Score each question above, then save.</span>}
                </div>
                <div className="flex gap-2">
                  {dirty && (
                    <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 gap-1 text-xs">
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !dirty || livePercent === null}
                    className="h-8 gap-1.5"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Scores {livePercent != null ? `(${livePercent}%)` : ''}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScreeningViewDialog;
