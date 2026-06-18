import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit2, Check } from 'lucide-react';

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

const ScreeningViewDialog: React.FC<ScreeningViewDialogProps> = ({ applicationId, open, onOpenChange }) => {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Manual score editing
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      setEditingScore(false);
      supabase
        .from('screening_responses')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle()
        .then(({ data: d }) => {
          setData(d);
          setScoreInput(d?.score != null ? String(d.score) : '');
          setLoading(false);
        });
    }
  }, [open, applicationId]);

  const handleSaveScore = async () => {
    if (!data) return;
    const numeric = Number(scoreInput);
    if (isNaN(numeric) || numeric < 0 || numeric > 100) {
      toast({ title: 'Invalid score', description: 'Score must be a number between 0 and 100.', variant: 'destructive' });
      return;
    }
    setSavingScore(true);
    const { error } = await (supabase as any)
      .from('screening_responses')
      .update({ score: numeric })
      .eq('id', data.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setData({ ...data, score: numeric });
      setEditingScore(false);
      toast({ title: 'Score saved', description: `Score set to ${numeric}/100` });
    }
    setSavingScore(false);
  };

  const responses = data?.responses as any;
  const questions = responses?.questions || [];
  const answers   = responses?.answers || {};
  const hasAnswers = Object.keys(answers).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Screening Results
            {data?.score != null && !editingScore && (
              <Badge variant="secondary">Score: {data.score}/100</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <p className="text-muted-foreground text-sm">No screening data found.</p>
        ) : (
          <div className="space-y-5">

            {/* AI feedback if present */}
            {responses?.feedback && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-xs text-muted-foreground mb-1 font-medium">AI Feedback</p>
                <p className="text-sm">{responses.feedback}</p>
              </div>
            )}

            {/* Manual score section */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</p>
                {!editingScore && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setScoreInput(data.score != null ? String(data.score) : ''); setEditingScore(true); }}>
                    <Edit2 className="h-3 w-3" /> {data.score != null ? 'Edit' : 'Add score'}
                  </Button>
                )}
              </div>
              {editingScore ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Score (0–100)</Label>
                    <Input
                      type="number" min={0} max={100} step={1}
                      value={scoreInput}
                      onChange={e => setScoreInput(e.target.value)}
                      placeholder="e.g. 75"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div className="flex gap-1.5 pt-5">
                    <Button size="sm" className="h-8 gap-1" onClick={handleSaveScore} disabled={savingScore}>
                      {savingScore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingScore(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground font-semibold">
                  {data.score != null ? `${data.score}/100` : <span className="text-muted-foreground font-normal">Not yet scored — use the button above to add a manual score.</span>}
                </p>
              )}
            </div>

            {/* Questions & answers */}
            {!hasAnswers ? (
              <p className="text-sm text-amber-600">
                Questions generated — awaiting candidate responses.
              </p>
            ) : (
              questions.map((q: any, idx: number) => {
                const rawAnswer = answers[q.id] || '';
                const { text, audioUrl } = parseAnswer(rawAnswer);
                return (
                  <div key={q.id} className="space-y-1.5 border-b pb-3 last:border-0">
                    <p className="text-sm font-medium">Q{idx + 1}: {q.question}</p>
                    {text ? (
                      <p className="text-sm text-muted-foreground">{text}</p>
                    ) : !audioUrl ? (
                      <p className="text-sm text-muted-foreground italic">No answer provided</p>
                    ) : null}
                    {audioUrl && (
                      <audio controls src={audioUrl} className="w-full h-10 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScreeningViewDialog;
