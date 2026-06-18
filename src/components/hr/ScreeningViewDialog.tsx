import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, CheckCircle2 } from 'lucide-react';

interface ScreeningViewDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScored?: () => void;
}

const parseAnswer = (answer: string) => {
  const lines = (answer || '').split('\n');
  const audioLine = lines.find((l) => l.startsWith('audio::'));
  const textLines = lines.filter((l) => !l.startsWith('audio::'));
  return { text: textLines.join('\n').trim(), audioUrl: audioLine ? audioLine.replace('audio::', '') : null };
};

// Build numeric score map from raw string inputs, clamping to 0-10
function buildParsedScores(qScores: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(qScores)) {
    const n = parseFloat(v);
    if (!isNaN(n)) out[k] = Math.max(0, Math.min(10, n));
  }
  return out;
}

function computePercent(parsed: Record<string, number>, questionCount: number): number | null {
  if (!questionCount || !Object.keys(parsed).length) return null;
  const total = Object.values(parsed).reduce((s, v) => s + v, 0);
  return Math.round((total / (questionCount * 10)) * 100);
}

const AUTO_SAVE_DELAY = 1500; // ms after last keystroke

const ScreeningViewDialog: React.FC<ScreeningViewDialogProps> = ({ applicationId, open, onOpenChange, onScored }) => {
  const { toast }             = useToast();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // Per-question scores as raw strings (so "7" vs "7.5" etc.)
  const [qScores, setQScores] = useState<Record<string, string>>({});
  const autoSaveTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to qScores so the auto-save closure always reads latest value
  const qScoresRef            = useRef(qScores);
  useEffect(() => { qScoresRef.current = qScores; }, [qScores]);

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setLastSaved(null);
    const { data: d } = await (supabase as any)
      .from('screening_responses')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    setData(d);
    const saved: Record<string, number> = d?.responses?.question_scores || {};
    const asStrings: Record<string, string> = {};
    Object.entries(saved).forEach(([k, v]) => { asStrings[k] = String(v); });
    setQScores(asStrings);
    if (Object.keys(saved).length > 0) setLastSaved(new Date(d?.responses?.scored_at || Date.now()));
    setLoading(false);
  }, [applicationId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Core save — always reads from refs so it's safe to call from timers
  const performSave = useCallback(async (silent = false) => {
    const currentData = dataRef.current;
    const currentQScores = qScoresRef.current;
    if (!currentData) return;

    const parsed = buildParsedScores(currentQScores);
    const responses = currentData.responses as any;
    const questions = responses?.questions || [];
    const finalPercent = computePercent(parsed, questions.length);

    // Validate
    for (const [, val] of Object.entries(currentQScores)) {
      if (val === '') continue;
      const n = parseFloat(val);
      if (isNaN(n) || n < 0 || n > 10) {
        if (!silent) toast({ title: 'Invalid score', description: 'Each question must be scored 0–10.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    const updatedResponses = {
      ...responses,
      question_scores: parsed,
      scored_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('screening_responses')
      .update({ responses: updatedResponses, score: finalPercent })
      .eq('id', currentData.id);

    if (error) {
      if (!silent) toast({ title: 'Error saving scores', description: error.message, variant: 'destructive' });
    } else {
      setData((prev: any) => ({ ...prev, score: finalPercent, responses: updatedResponses }));
      setLastSaved(new Date());
      if (!silent) {
        const total = Object.values(parsed).reduce((s, v) => s + v, 0);
        const max = questions.length * 10;
        toast({ title: 'Scores saved', description: `Final score: ${finalPercent}% (${total}/${max} points)` });
        // Close dialog and trigger page refresh so score column updates
        onScored?.();
        onOpenChange(false);
      }
    }
    setSaving(false);
  }, [toast]);

  // Schedule auto-save after user stops typing
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => performSave(true), AUTO_SAVE_DELAY);
  }, [performSave]);

  // Cleanup timer on unmount/close
  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const handleScoreChange = (qId: string, val: string) => {
    setQScores(prev => ({ ...prev, [qId]: val }));
    scheduleAutoSave();
  };

  const handleReset = () => {
    const saved: Record<string, number> = data?.responses?.question_scores || {};
    const asStrings: Record<string, string> = {};
    Object.entries(saved).forEach(([k, v]) => { asStrings[k] = String(v); });
    setQScores(asStrings);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  };

  const responses  = data?.responses as any;
  const questions  = responses?.questions || [];
  const answers    = responses?.answers   || {};
  const hasAnswers = Object.keys(answers).length > 0;

  const parsed      = buildParsedScores(qScores);
  const liveTotal   = Object.values(parsed).reduce((s, v) => s + v, 0);
  const maxTotal    = questions.length * 10;
  const livePercent = computePercent(parsed, questions.length);
  const scoredCount = Object.keys(parsed).length;
  const savedPercent = data?.score ?? null;

  const saveStatus = saving
    ? 'saving'
    : lastSaved
      ? 'saved'
      : 'unsaved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Screening Results</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Score each answer 0–10. Auto-saves as you type.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-save status indicator */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
            {savedPercent != null && (
              <Badge
                variant={savedPercent >= 70 ? 'default' : savedPercent >= 50 ? 'secondary' : 'destructive'}
                className="text-sm px-3 py-1">
                {savedPercent}%
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <p className="text-muted-foreground text-sm p-6">No screening data found.</p>
        ) : (
          <>
            {/* Live progress bar */}
            {questions.length > 0 && (
              <div className="px-6 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    {scoredCount} / {questions.length} scored · {liveTotal} / {maxTotal} pts
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

            {/* Questions */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!hasAnswers ? (
                <div className="text-center py-8">
                  <p className="text-sm text-amber-600 font-medium">Questions generated — awaiting candidate responses.</p>
                  <p className="text-xs text-muted-foreground mt-1">Scores can be entered once the candidate submits answers.</p>
                </div>
              ) : questions.map((q: any, idx: number) => {
                const rawAnswer = answers[q.id] || '';
                const { text, audioUrl } = parseAnswer(rawAnswer);
                const scoreVal   = qScores[q.id] ?? '';
                const num        = parseFloat(scoreVal);
                const isInvalid  = scoreVal !== '' && (isNaN(num) || num < 0 || num > 10);
                const borderColor = isInvalid ? 'border-destructive focus-visible:ring-destructive'
                  : num >= 8 ? 'border-emerald-400' : num >= 5 ? 'border-amber-400'
                  : scoreVal !== '' ? 'border-red-400' : '';

                return (
                  <div key={q.id} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-muted/30 border-b">
                      <p className="text-sm font-semibold text-foreground flex-1 leading-snug">
                        Q{idx + 1}: {q.question}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number" min={0} max={10} step={1}
                          value={scoreVal}
                          onChange={e => handleScoreChange(q.id, e.target.value)}
                          placeholder="—"
                          className={`h-8 w-16 text-center text-sm font-semibold ${borderColor}`}
                          aria-label={`Score for question ${idx + 1}`}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">/ 10</span>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      {text
                        ? <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
                        : !audioUrl
                          ? <p className="text-sm text-muted-foreground italic">No written answer provided</p>
                          : null}
                      {audioUrl && <audio controls src={audioUrl} className="w-full h-10 mt-2" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {hasAnswers && questions.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/10 shrink-0">
                <div className="text-xs text-muted-foreground">
                  {lastSaved
                    ? `Last saved ${lastSaved.toLocaleTimeString()}`
                    : 'Changes auto-save after you stop typing'}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 gap-1 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => performSave(false)}
                    disabled={saving}
                    className="h-8 gap-1.5"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Now {livePercent != null ? `(${livePercent}%)` : ''}
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
