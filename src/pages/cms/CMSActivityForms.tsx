import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { db } from '@/lib/supabase-db';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowLeft, Eye, ClipboardList } from 'lucide-react';

const CMSActivityForms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await db.from('activity_forms').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setForms(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchForms(); }, []);

  const handleCreate = async () => {
    if (!user) return;
    const { data, error } = await db
      .from('activity_forms')
      .insert({ title: 'Untitled Form', frequency: 'daily', created_by: user.id, is_active: false })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    navigate(`/cms/activity-forms/${data.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this form and all submissions?')) return;
    const { error } = await db.from('activity_forms').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    fetchForms();
  };

  return (
    <DashboardLayout title="Activity Forms">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">Activity Forms</h2>
            <p className="text-sm text-muted-foreground">Design forms employees fill out from their Activity Report.</p>
          </div>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> New Form</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : forms.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No forms yet. Create your first one.</TableCell></TableRow>
            ) : forms.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.title}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{f.frequency.replace('_', ' ')}</Badge></TableCell>
                <TableCell>{f.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Draft</Badge>}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" title="Submissions" onClick={() => navigate(`/cms/activity-forms/${f.id}/submissions`)}>
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => navigate(`/cms/activity-forms/${f.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default CMSActivityForms;
