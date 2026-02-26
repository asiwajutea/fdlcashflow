import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db } from '@/lib/supabase-db';
import { ArrowLeft, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const CMSContacts = () => {
  const [items, setItems] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);

  const fetchData = async () => {
    const { data } = await db.from('contact_submissions').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { fetchData(); }, []);

  const markRead = async (item: any) => {
    setViewing(item);
    if (!item.is_read) {
      await db.from('contact_submissions').update({ is_read: true }).eq('id', item.id);
      fetchData();
    }
  };

  return (
    <DashboardLayout title="Contact Submissions">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h2 className="text-xl font-bold text-foreground">Contact Submissions</h2>
      </div>
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id} className={!s.is_read ? 'font-semibold' : ''}>
                <TableCell>{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>{s.subject || '—'}</TableCell>
                <TableCell><Badge variant={s.is_read ? 'secondary' : 'default'}>{s.is_read ? 'Read' : 'New'}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => markRead(s)}><Eye className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Message from {viewing?.name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div><span className="text-sm text-muted-foreground">Email:</span> <span>{viewing.email}</span></div>
              {viewing.phone && <div><span className="text-sm text-muted-foreground">Phone:</span> <span>{viewing.phone}</span></div>}
              {viewing.subject && <div><span className="text-sm text-muted-foreground">Subject:</span> <span>{viewing.subject}</span></div>}
              <div className="pt-2 border-t"><p className="whitespace-pre-wrap">{viewing.message}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CMSContacts;
