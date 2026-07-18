import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface Props {
  applicationId: string | null;
  candidateName?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface NoteRow {
  id: string;
  application_id: string;
  author_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

const ApplicationNotesDialog: React.FC<Props> = ({ applicationId, candidateName, open, onOpenChange }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    if (!applicationId) return;
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    setUserId(userRes?.user?.id || null);

    const { data } = await (supabase as any)
      .from('application_notes')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    const rows: NoteRow[] = data || [];
    const authorIds = [...new Set(rows.map(r => r.author_id))];
    if (authorIds.length) {
      const { data: profs } = await (supabase as any)
        .from('profiles').select('id, full_name').in('id', authorIds);
      const map = new Map<string, string>((profs || []).map((p: any) => [p.id, p.full_name || 'HR']));
      rows.forEach(r => { r.author_name = map.get(r.author_id) || 'HR'; });
    }
    setNotes(rows);
    setLoading(false);
  };

  useEffect(() => { if (open) { setDraft(''); load(); } /* eslint-disable-next-line */ }, [open, applicationId]);

  const handleAdd = async () => {
    if (!draft.trim() || !applicationId || !userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from('application_notes').insert({
      application_id: applicationId,
      author_id: userId,
      note: draft.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not add note', description: error.message, variant: 'destructive' });
    } else {
      setDraft('');
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('application_notes').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>HR Private Notes</DialogTitle>
          {candidateName && <p className="text-sm text-muted-foreground">Candidate: <span className="font-medium text-foreground">{candidateName}</span></p>}
          <p className="text-xs text-muted-foreground">Visible to all HR — hidden from the candidate.</p>
        </DialogHeader>

        <div className="space-y-2 flex-1 overflow-y-auto min-h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
          ) : notes.map(n => (
            <div key={n.id} className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{n.author_name}</span> · {new Date(n.created_at).toLocaleString()}
                </div>
                {n.author_id === userId && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.note}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <Textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a private HR note…" rows={3} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Add Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationNotesDialog;
