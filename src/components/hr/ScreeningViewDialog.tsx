import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ScreeningViewDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScreeningViewDialog: React.FC<ScreeningViewDialogProps> = ({ applicationId, open, onOpenChange }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && applicationId) {
      setLoading(true);
      supabase
        .from('screening_responses')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle()
        .then(({ data: d }) => {
          setData(d);
          setLoading(false);
        });
    }
  }, [open, applicationId]);

  const responses = data?.responses as any;
  const questions = responses?.questions || [];
  const answers = responses?.answers || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Screening Results
            {data?.score != null && (
              <Badge variant="secondary">Score: {data.score}/100</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !data ? (
          <p className="text-muted-foreground">No screening data found.</p>
        ) : (
          <div className="space-y-4">
            {responses?.feedback && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-xs text-muted-foreground mb-1">AI Feedback</p>
                <p className="text-sm">{responses.feedback}</p>
              </div>
            )}
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-1">
                <p className="text-sm font-medium">
                  Q{idx + 1}: {q.question}
                </p>
                <p className="text-sm text-muted-foreground">
                  {answers[q.id] || <em>No answer provided</em>}
                </p>
              </div>
            ))}
            {questions.length > 0 && Object.keys(answers).length === 0 && (
              <p className="text-sm text-amber-600">
                Questions generated — awaiting candidate responses.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScreeningViewDialog;
