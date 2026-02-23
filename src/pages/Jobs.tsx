import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, Plus, MapPin, Clock, Edit, Trash2 } from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  status: string;
  created_at: string;
}

const Jobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosition | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    status: 'open'
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load jobs', variant: 'destructive' });
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Job title is required', variant: 'destructive' });
      return;
    }

    if (editingJob) {
      const { error } = await supabase
        .from('job_positions')
        .update(formData)
        .eq('id', editingJob.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Job position updated' });
      }
    } else {
      const { error } = await supabase
        .from('job_positions')
        .insert({ ...formData, created_by: user?.id });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Job position created' });
      }
    }

    setDialogOpen(false);
    setEditingJob(null);
    setFormData({ title: '', department: '', description: '', requirements: '', status: 'open' });
    fetchJobs();
  };

  const handleEdit = (job: JobPosition) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department,
      description: job.description,
      requirements: job.requirements,
      status: job.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (jobId: string) => {
    const { error } = await supabase.from('job_positions').delete().eq('id', jobId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Job position deleted' });
      fetchJobs();
    }
  };

  const openJobs = jobs.filter(j => j.status === 'open');
  const closedJobs = jobs.filter(j => j.status !== 'open');

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Job Openings">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Job Openings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Available Positions</h2>
            <p className="text-muted-foreground">{openJobs.length} open position{openJobs.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingJob(null);
                setFormData({ title: '', department: '', description: '', requirements: '', status: 'open' });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Job Position
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingJob ? 'Edit Job Position' : 'Create Job Position'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Job Title</Label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Field Data Agent" className="mt-1" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Operations" className="mt-1" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Job description..." className="mt-1" rows={4} />
                  </div>
                  <div>
                    <Label>Requirements</Label>
                    <Textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} placeholder="Required qualifications..." className="mt-1" rows={3} />
                  </div>
                  {editingJob && (
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleSubmit} className="w-full">
                    {editingJob ? 'Update Position' : 'Create Position'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Job Cards */}
        {openJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Open Positions</h3>
            <p className="text-muted-foreground mt-1">Check back later for new opportunities.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openJobs.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {job.department || 'General'}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Open</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">{job.description || 'No description provided.'}</p>
                  {job.requirements && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground mb-1">Requirements:</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{job.requirements}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/apply?jobId=${job.id}`)}>
                    Apply Now
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(job)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(job.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Closed Jobs (admin view) */}
        {isAdmin && closedJobs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Closed / On Hold Positions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedJobs.map((job) => (
                <Card key={job.id} className="opacity-60">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                    <CardDescription>{job.department}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(job)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
