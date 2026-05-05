import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCapabilities } from '@/hooks/useCapabilities';
import { Briefcase, Plus, MapPin, Edit, Trash2, Building2 } from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  key_responsibilities: string;
  job_type: string;
  compensation: string;
  work_location_country: string;
  work_location_state: string;
  media_url: string | null;
  status: string;
  created_at: string;
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];

const Jobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosition | null>(null);
  const [formData, setFormData] = useState({
    title: '', department: '', description: '', requirements: '',
    key_responsibilities: '', job_type: '', compensation: '',
    work_location_country: '', work_location_state: '', media_url: '',
    status: 'open'
  });

  const { hasCapability } = useCapabilities(user?.id ?? null);
  const isAdmin = role === 'admin' || hasCapability('add_job_position');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load jobs', variant: 'destructive' });
    } else {
      setJobs((data as any[]) || []);
    }
    setLoading(false);
  };

  const resetForm = () => setFormData({
    title: '', department: '', description: '', requirements: '',
    key_responsibilities: '', job_type: '', compensation: '',
    work_location_country: '', work_location_state: '', media_url: '',
    status: 'open'
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Job title is required', variant: 'destructive' });
      return;
    }
    const payload = { ...formData, media_url: formData.media_url || null };

    if (editingJob) {
      const { error } = await supabase.from('job_positions').update(payload).eq('id', editingJob.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Success', description: 'Job position updated' });
    } else {
      const { error } = await supabase.from('job_positions').insert({ ...payload, created_by: user?.id });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Success', description: 'Job position created' });
    }
    setDialogOpen(false);
    setEditingJob(null);
    resetForm();
    fetchJobs();
  };

  const handleEdit = (job: JobPosition) => {
    setEditingJob(job);
    setFormData({
      title: job.title, department: job.department, description: job.description,
      requirements: job.requirements, key_responsibilities: job.key_responsibilities || '',
      job_type: job.job_type || '', compensation: job.compensation || '',
      work_location_country: job.work_location_country || '',
      work_location_state: job.work_location_state || '',
      media_url: job.media_url || '', status: job.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (jobId: string) => {
    const { error } = await supabase.from('job_positions').delete().eq('id', jobId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Success', description: 'Job position deleted' }); fetchJobs(); }
  };

  const openJobs = jobs.filter(j => j.status === 'open');
  const closedJobs = jobs.filter(j => j.status !== 'open');

  const locationText = (job: JobPosition) => {
    const parts = [job.work_location_state, job.work_location_country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Available Positions</h2>
            <p className="text-muted-foreground">{openJobs.length} open position{openJobs.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) { setEditingJob(null); resetForm(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Job Position</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingJob ? 'Edit Job Position' : 'Create Job Position'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Job Title *</Label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Field Data Agent" className="mt-1" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Operations" className="mt-1" />
                  </div>
                  <div>
                    <Label>Job Type</Label>
                    <Select value={formData.job_type} onValueChange={(v) => setFormData({ ...formData, job_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Job description..." className="mt-1" rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Key Responsibilities</Label>
                    <Textarea value={formData.key_responsibilities} onChange={(e) => setFormData({ ...formData, key_responsibilities: e.target.value })} placeholder="List key responsibilities..." className="mt-1" rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Requirements</Label>
                    <Textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} placeholder="Required qualifications..." className="mt-1" rows={3} />
                  </div>
                  <div>
                    <Label>Compensation</Label>
                    <Input value={formData.compensation} onChange={(e) => setFormData({ ...formData, compensation: e.target.value })} placeholder="e.g. ₦150,000/month" className="mt-1" />
                  </div>
                  <div>
                    <Label>Media URL (Image)</Label>
                    <Input value={formData.media_url} onChange={(e) => setFormData({ ...formData, media_url: e.target.value })} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={formData.work_location_country} onChange={(e) => setFormData({ ...formData, work_location_country: e.target.value })} placeholder="e.g. Nigeria" className="mt-1" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={formData.work_location_state} onChange={(e) => setFormData({ ...formData, work_location_state: e.target.value })} placeholder="e.g. Lagos" className="mt-1" />
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
                  <div className="md:col-span-2">
                    <Button onClick={handleSubmit} className="w-full">
                      {editingJob ? 'Update Position' : 'Create Position'}
                    </Button>
                  </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openJobs.map((job) => (
              <Card key={job.id} className="group flex flex-col overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Media */}
                {job.media_url && (
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img src={job.media_url} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="icon" variant="secondary" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleEdit(job); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {!job.media_url && (
                  <div className="relative h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <Building2 className="h-10 w-10 text-primary/30" />
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="icon" variant="secondary" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleEdit(job); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <CardContent className="flex-1 p-5 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">{job.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.department && <Badge variant="secondary" className="text-xs">{job.department}</Badge>}
                      {job.job_type && <Badge variant="outline" className="text-xs">{job.job_type}</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description ? job.description.slice(0, 120) + (job.description.length > 120 ? '...' : '') : 'No description provided.'}
                  </p>
                  {locationText(job) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{locationText(job)}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Button className="w-full" onClick={() => navigate(`/apply?jobId=${job.id}`)}>
                    Apply Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Closed Jobs (admin) */}
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
                    <p className="text-sm text-muted-foreground">{job.department}</p>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(job)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(job.id)}><Trash2 className="h-3 w-3" /></Button>
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
