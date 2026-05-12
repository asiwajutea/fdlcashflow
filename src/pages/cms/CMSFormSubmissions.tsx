import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/supabase-db';
import { ArrowLeft, Download, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const CMSFormSubmissions = () => {
  const { id } = useParams();
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [view, setView] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: ff }, { data: ss }] = await Promise.all([
        db.from('activity_forms').select('*').eq('id', id).single(),
        db.from('activity_form_fields').select('*').eq('form_id', id).order('display_order'),
        db.from('activity_form_submissions').select('*').eq('form_id', id).order('submitted_at', { ascending: false }),
      ]);
      setForm(f);
      setFields(ff || []);
      setSubmissions(ss || []);
      const userIds = [...new Set((ss || []).map((s: any) => s.user_id))];
      if (userIds.length) {
        const { data: ps } = await db.from('profiles').select('id,full_name,email').in('id', userIds);
        const map: any = {};
        (ps || []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
    })();
  }, [id]);

  const exportCsv = () => {
    if (!submissions.length) return;
    const headers = ['User', 'Email', 'Period', 'Submitted', ...fields.map((f) => f.label)];
    const rows = submissions.map((s) => {
      const p = profiles[s.user_id] || {};
      return [
        p.full_name || '',
        p.email || '',
        s.period_key,
        new Date(s.submitted_at).toISOString(),
        ...fields.map((f) => {
          const v = s.answers?.[f.field_key];
          if (Array.isArray(v)) return v.join('; ');
          return v ?? '';
        }),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.title || 'submissions'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  if (!form) return <DashboardLayout title="Submissions"><p className="text-muted-foreground">Loading…</p></DashboardLayout>;

  return (
    <DashboardLayout title="Submissions">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms/activity-forms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">{form.title} — Submissions</h2>
            <p className="text-sm text-muted-foreground">{submissions.length} response(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/cms/activity-forms/${id}/analytics`}><Button variant="outline"><BarChart3 className="h-4 w-4 mr-2" /> Analytics</Button></Link>
          <Button variant="outline" onClick={exportCsv} disabled={!submissions.length}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No submissions yet.</TableCell></TableRow>
            ) : submissions.map((s) => {
              const p = profiles[s.user_id] || {};
              return (
                <TableRow key={s.id}>
                  <TableCell>{p.full_name || p.email || s.user_id}</TableCell>
                  <TableCell><code className="text-xs">{s.period_key}</code></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(s.submitted_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setView(s)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Response Details</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.id} className="border-b pb-2">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-medium">
                    {(() => {
                      const v = view.answers?.[f.field_key];
                      if (v === undefined || v === null || v === '') return <span className="text-muted-foreground italic">—</span>;
                      if (Array.isArray(v)) return v.join(', ');
                      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                      return String(v);
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSFormSubmissions;
