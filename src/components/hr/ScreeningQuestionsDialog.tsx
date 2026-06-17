import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Trash2, GripVertical, Loader2, Sparkles, X, ChevronDown, ChevronUp,
} from 'lucide-react';

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'short_answer';
  options?: string[];
}

interface Props {
  jobId: string;
  jobTitle: string;
  jobDepartment: string;
  jobDescription: string;
  jobRequirements: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const newQuestion = (): ScreeningQuestion => ({
  id: `q${Date.now()}`,
  question: '',
  type: 'short_answer',
  options: [],
});

const ScreeningQuestionsDialog: React.FC<Props> = ({
  jobId, jobTitle, jobDepartment, jobDescription, jobRequirements, open, onOpenChange,
}) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  // Load existing template for this job
  useEffect(() => {
    if (!open || !jobId) return;
    setLoading(true);
    (supabase as any)
      .from('job_screening_templates')
      .select('id, questions')
      .eq('job_id', jobId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setTemplateId(data.id);
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
        } else {
          setTemplateId(null);
          setQuestions([]);
        }
        setLoading(false);
      });
  }, [open, jobId]);

  const handleAddQuestion = () => {
    const q = newQuestion();
    setQuestions(prev => [...prev, q]);
    setExpandedIdx(questions.length); // expand new question
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const updateQuestion = (idx: number, patch: Partial<ScreeningQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const addOption = (idx: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === idx ? { ...q, options: [...(q.options || []), ''] } : q
    ));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx
        ? { ...q, options: (q.options || []).map((o, oi) => oi === optIdx ? value : o) }
        : q
    ));
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: (q.options || []).filter((_, oi) => oi !== optIdx) } : q
    ));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    setQuestions(updated);
    setExpandedIdx(next);
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-screening', {
        body: {
          job_title: jobTitle,
          department: jobDepartment,
          description: jobDescription,
          requirements: jobRequirements,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated: ScreeningQuestion[] = (data.questions || []).map((q: any, i: number) => ({
        id: `q${Date.now()}_${i}`,
        question: q.question,
        type: q.type,
        options: q.options || [],
      }));
      setQuestions(generated);
      setExpandedIdx(0);
      toast({ title: 'AI Generated', description: `${generated.length} questions created. Review and edit before saving.` });
    } catch (e: any) {
      toast({ title: 'Generation Failed', description: e.message || 'Could not generate questions', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    // Validate — every question must have text
    const invalid = questions.findIndex(q => !q.question.trim());
    if (invalid !== -1) {
      setExpandedIdx(invalid);
      toast({ title: 'Validation Error', description: `Question ${invalid + 1} cannot be empty.`, variant: 'destructive' });
      return;
    }
    // Validate multiple choice has at least 2 options
    const badMC = questions.findIndex(q => q.type === 'multiple_choice' && (q.options || []).filter(o => o.trim()).length < 2);
    if (badMC !== -1) {
      setExpandedIdx(badMC);
      toast({ title: 'Validation Error', description: `Question ${badMC + 1} needs at least 2 options.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        job_id: jobId,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question.trim(),
          type: q.type,
          ...(q.type === 'multiple_choice' ? { options: (q.options || []).filter(o => o.trim()) } : {}),
        })),
      };

      if (templateId) {
        const { error } = await (supabase as any)
          .from('job_screening_templates')
          .update({ questions: payload.questions })
          .eq('id', templateId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('job_screening_templates')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setTemplateId(data.id);
      }

      toast({ title: 'Saved', description: `${questions.length} screening question${questions.length !== 1 ? 's' : ''} saved for this job.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message || 'Could not save questions', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    setQuestions([]);
    setExpandedIdx(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Screening Questions
            {questions.length > 0 && (
              <Badge variant="secondary">{questions.length} question{questions.length !== 1 ? 's' : ''}</Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{jobTitle}</span> · Questions candidates answer when moved to screening stage.
          </p>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateWithAI}
            disabled={generating || saving}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {questions.length > 0 ? 'Regenerate with AI' : 'Generate with AI'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleAddQuestion} disabled={saving} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Question
          </Button>
          {questions.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleClearAll} disabled={saving} className="gap-1.5 text-destructive hover:text-destructive ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          )}
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No questions yet.</p>
              <p className="text-xs mt-1">Use "Generate with AI" for instant questions or add them manually.</p>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="border rounded-lg bg-card overflow-hidden">
                {/* Question header — click to expand */}
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground w-6 shrink-0">Q{idx + 1}</span>
                  <p className="text-sm flex-1 truncate">
                    {q.question || <span className="italic text-muted-foreground">Untitled question</span>}
                  </p>
                  <Badge variant={q.type === 'multiple_choice' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                    {q.type === 'multiple_choice' ? 'Choice' : 'Text'}
                  </Badge>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); moveQuestion(idx, -1); }}
                      disabled={idx === 0}
                    ><ChevronUp className="h-3 w-3" /></Button>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 1); }}
                      disabled={idx === questions.length - 1}
                    ><ChevronDown className="h-3 w-3" /></Button>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(idx); }}
                    ><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>

                {/* Expanded editor */}
                {expandedIdx === idx && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Question text</Label>
                      <Textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                        placeholder="Enter your screening question…"
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Answer type</Label>
                      <Select
                        value={q.type}
                        onValueChange={(v: 'multiple_choice' | 'short_answer') => {
                          updateQuestion(idx, {
                            type: v,
                            options: v === 'multiple_choice' ? (q.options?.length ? q.options : ['', '']) : [],
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short_answer">Short answer (text / voice)</SelectItem>
                          <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Options</Label>
                        <div className="space-y-2">
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} className="flex gap-2 items-center">
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(idx, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className="h-8 text-sm"
                              />
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeOption(idx, oi)}
                              ><X className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addOption(idx)}>
                            <Plus className="h-3 w-3" /> Add option
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading || questions.length === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save {questions.length > 0 ? `${questions.length} Question${questions.length !== 1 ? 's' : ''}` : 'Questions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScreeningQuestionsDialog;
