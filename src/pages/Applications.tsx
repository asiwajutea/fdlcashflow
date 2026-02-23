import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Eye, FileText, ExternalLink } from 'lucide-react';

interface ApplicationRow {
  id: string;
  cover_letter: string | null;
  status: string;
  applied_at: string;
  candidate: {
    id: string;
    phone: string | null;
    education: string | null;
    experience_summary: string | null;
    resume_url: string | null;
    user_id: string;
  };
  job: {
    id: string;
    title: string;
    department: string;
  };
  candidate_name: string | null;
}

const STATUS_OPTIONS = ['submitted', 'screening', 'interview', 'offered', 'hired', 'rejected'];

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'hired': return 'default';
    case 'rejected': return 'destructive';
    case 'interview':
    case 'offered': return 'secondary';
    default: return 'outline';
  }
};

const Applications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && user && !isAdmin) navigate('/');
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchApplications();
  }, [isAdmin]);

  const fetchApplications = async () => {
    // Fetch applications with candidate and job info
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, cover_letter, status, applied_at,
        candidates!inner(id, phone, education, experience_summary, resume_url, user_id),
        job_positions!inner(id, title, department)
      `)
      .order('applied_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch candidate names from profiles
    const userIds = [...new Set((data || []).map((a: any) => a.candidates.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    const mapped: ApplicationRow[] = (data || []).map((a: any) => ({
      id: a.id,
      cover_letter: a.cover_letter,
      status: a.status,
      applied_at: a.applied_at,
      candidate: a.candidates,
      job: a.job_positions,
      candidate_name: profileMap.get(a.candidates.user_id) || 'Unknown'
    }));

    setApplications(mapped);
    setLoading(false);
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated', description: `Application moved to "${newStatus}"` });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    }
  };

  const viewDetails = (app: ApplicationRow) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Applications">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="HR Applications Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Applications
            </h2>
            <p className="text-muted-foreground">{applications.length} total application{applications.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/jobs')}>View Job Listings</Button>
        </div>

        {applications.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Applications Yet</h3>
            <p className="text-muted-foreground">Applications will appear here when candidates apply.</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.candidate_name}</TableCell>
                    <TableCell>{app.job.title}</TableCell>
                    <TableCell>{app.job.department}</TableCell>
                    <TableCell>
                      <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                        <SelectTrigger className="w-[130px]">
                          <Badge variant={statusVariant(app.status)} className="text-xs">
                            {app.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => viewDetails(app)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Candidate</p>
                    <p className="font-medium">{selectedApp.candidate_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedApp.job.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedApp.candidate.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Education</p>
                    <p className="font-medium">{selectedApp.candidate.education || 'N/A'}</p>
                  </div>
                </div>
                {selectedApp.candidate.experience_summary && (
                  <div>
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-sm">{selectedApp.candidate.experience_summary}</p>
                  </div>
                )}
                {selectedApp.cover_letter && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cover Letter</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedApp.cover_letter}</p>
                  </div>
                )}
                {selectedApp.candidate.resume_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedApp.candidate.resume_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> View Resume
                    </a>
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Applications;
