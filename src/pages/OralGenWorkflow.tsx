import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import {
  Plus, MapPin, Clock, Upload, FileText, Archive, CheckCircle2,
  Camera, Loader2, Download, ClipboardList, Users, Gavel,
} from 'lucide-react';

type Status =
  | 'pending_interview'
  | 'in_progress'
  | 'awaiting_audit'
  | 'audit_in_progress'
  | 'completed';

interface Interview {
  id: string;
  created_by: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  individual_photo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  home_photo_url: string | null;
  path_photo_url: string | null;
  notes: string | null;
  status: Status;
  interviewer_id: string | null;
  interviewer_accepted_at: string | null;
  interview_deadline: string | null;
  interview_completed_at: string | null;
  pdf_url: string | null;
  zip_url: string | null;
  field_manager_id: string | null;
  audit_accepted_at: string | null;
  audit_scheduled_date: string | null;
  audit_deadline: string | null;
  audit_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending_interview: { label: 'Pending Interview', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  awaiting_audit: { label: 'Awaiting Audit', variant: 'secondary' },
  audit_in_progress: { label: 'Audit In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
};

/** Distance in km between two GPS coords (Haversine). */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function Countdown({ deadline }: { deadline: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return (
    <Badge variant={h < 2 ? 'destructive' : 'secondary'} className="gap-1">
      <Clock className="h-3 w-3" /> {h}h {m}m left
    </Badge>
  );
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('oralgen-files').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('oralgen-files').createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

// ------------------ Booking Form ------------------

function BookingForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', age: '', sex: '', phone: '',
    address: '', city: '', state: '', notes: '',
    gps_lat: '' as string, gps_lng: '' as string,
  });
  const [files, setFiles] = useState<{ individual?: File; home?: File; path?: File }>({});

  const captureGps = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS not available', variant: 'destructive' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, gps_lat: String(pos.coords.latitude), gps_lng: String(pos.coords.longitude) })),
      () => toast({ title: 'Could not read location', variant: 'destructive' }),
    );
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast({ title: 'Name is required', variant: 'destructive' });
    if (!user) return;
    try {
      setSaving(true);
      const [ind, home, path] = await Promise.all([
        files.individual ? uploadFile(files.individual, `photos/${user.id}`) : Promise.resolve(null),
        files.home ? uploadFile(files.home, `photos/${user.id}`) : Promise.resolve(null),
        files.path ? uploadFile(files.path, `photos/${user.id}`) : Promise.resolve(null),
      ]);
      const { error } = await db.from('oralgen_interviews').insert({
        created_by: user.id,
        full_name: form.full_name.trim(),
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        gps_lat: form.gps_lat ? Number(form.gps_lat) : null,
        gps_lng: form.gps_lng ? Number(form.gps_lng) : null,
        individual_photo_url: ind,
        home_photo_url: home,
        path_photo_url: path,
        notes: form.notes || null,
        status: 'pending_interview',
      });
      if (error) throw error;
      toast({ title: 'Booking created' });
      setOpen(false);
      setForm({ full_name: '', age: '', sex: '', phone: '', address: '', city: '', state: '', notes: '', gps_lat: '', gps_lng: '' });
      setFiles({});
      onSaved();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Booking</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Interview Booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
            <div><Label>Sex</Label><Input value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Label>GPS</Label><Input placeholder="lat, lng" value={form.gps_lat && form.gps_lng ? `${form.gps_lat}, ${form.gps_lng}` : ''} readOnly /></div>
              <Button type="button" variant="outline" onClick={captureGps}><MapPin className="h-4 w-4" /></Button>
            </div>
            <div><Label>Individual Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, individual: e.target.files?.[0] })} /></div>
            <div><Label>Home Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, home: e.target.files?.[0] })} /></div>
            <div><Label>Path to Home Photo</Label><Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, path: e.target.files?.[0] })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Booking'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------ Row actions ------------------

function InterviewerActions({ row, myLoc, onRefresh }: { row: Interview; myLoc: { lat: number; lng: number } | null; onRefresh: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 3600 * 1000);
    const { error } = await db.from('oralgen_interviews').update({
      interviewer_id: user.id,
      interviewer_accepted_at: now.toISOString(),
      interview_deadline: deadline.toISOString(),
      status: 'in_progress',
    }).eq('id', row.id).eq('status', 'pending_interview');
    setBusy(false);
    if (error) return toast({ title: 'Could not accept', description: error.message, variant: 'destructive' });
    toast({ title: 'Job accepted — 24h countdown started' });
    onRefresh();
  };

  const uploadAndComplete = async () => {
    if (!user) return;
    if (pdf && pdf.size > 20 * 1024 * 1024) return toast({ title: 'PDF exceeds 20MB', variant: 'destructive' });
    if (zip && zip.size > 50 * 1024 * 1024) return toast({ title: 'ZIP exceeds 50MB', variant: 'destructive' });
    try {
      setBusy(true);
      const [pdfPath, zipPath] = await Promise.all([
        pdf ? uploadFile(pdf, `interviews/${row.id}`) : Promise.resolve(row.pdf_url),
        zip ? uploadFile(zip, `interviews/${row.id}`) : Promise.resolve(row.zip_url),
      ]);
      const { error } = await db.from('oralgen_interviews').update({
        pdf_url: pdfPath,
        zip_url: zipPath,
        interview_completed_at: new Date().toISOString(),
        status: 'awaiting_audit',
      }).eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Marked as awaiting audit' });
      setUploadOpen(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const dist = myLoc && row.gps_lat != null && row.gps_lng != null
    ? distanceKm(myLoc, { lat: Number(row.gps_lat), lng: Number(row.gps_lng) })
    : null;

  if (row.status === 'pending_interview') {
    return (
      <div className="flex items-center gap-2">
        {dist !== null && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {dist.toFixed(1)} km</Badge>}
        <Button size="sm" onClick={accept} disabled={busy}>Accept</Button>
      </div>
    );
  }
  if (row.status === 'in_progress' && row.interviewer_id === user?.id) {
    return (
      <div className="flex items-center gap-2">
        <Countdown deadline={row.interview_deadline} />
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Complete
        </Button>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Complete Interview</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Scanned PDF (max 20MB, optional)</Label><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Zipped Mobile Data (max 50MB, optional)</Label><Input type="file" accept=".zip,application/zip" onChange={(e) => setZip(e.target.files?.[0] ?? null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={uploadAndComplete} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Completed'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function FieldManagerActions({ row, onRefresh }: { row: Interview; onRefresh: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!user || !date) return toast({ title: 'Pick a scheduled audit date', variant: 'destructive' });
    setBusy(true);
    const scheduled = new Date(date);
    const deadline = new Date(scheduled.getTime() + 48 * 3600 * 1000);
    const { error } = await db.from('oralgen_interviews').update({
      field_manager_id: user.id,
      audit_accepted_at: new Date().toISOString(),
      audit_scheduled_date: scheduled.toISOString(),
      audit_deadline: deadline.toISOString(),
      status: 'audit_in_progress',
    }).eq('id', row.id).eq('status', 'awaiting_audit');
    setBusy(false);
    if (error) return toast({ title: 'Could not accept', description: error.message, variant: 'destructive' });
    toast({ title: 'Audit locked to you' });
    setOpen(false);
    onRefresh();
  };

  const complete = async () => {
    const { error } = await db.from('oralgen_interviews').update({
      audit_completed_at: new Date().toISOString(),
      status: 'completed',
    }).eq('id', row.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Audit completed' });
    onRefresh();
  };

  const downloadFile = async (path: string | null) => {
    const url = await signedUrl(path);
    if (!url) return toast({ title: 'File unavailable', variant: 'destructive' });
    window.open(url, '_blank');
  };

  if (row.status === 'awaiting_audit') {
    return (
      <>
        <Button size="sm" onClick={() => setOpen(true)}>Accept Audit</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Audit</DialogTitle></DialogHeader>
            <div><Label>Audit Date</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">You have 48h from this date to complete the audit.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={accept} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lock & Schedule'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  if (row.status === 'audit_in_progress' && row.field_manager_id === user?.id) {
    return (
      <div className="flex items-center gap-2">
        <Countdown deadline={row.audit_deadline} />
        {row.pdf_url && <Button size="sm" variant="outline" onClick={() => downloadFile(row.pdf_url)}><FileText className="h-4 w-4" /></Button>}
        {row.zip_url && <Button size="sm" variant="outline" onClick={() => downloadFile(row.zip_url)}><Archive className="h-4 w-4" /></Button>}
        <Button size="sm" onClick={complete}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete</Button>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ------------------ List ------------------

function InterviewTable({
  rows, myLoc, onRefresh, mode,
}: {
  rows: Interview[]; myLoc: { lat: number; lng: number } | null; onRefresh: () => void;
  mode: 'interviewer' | 'audit' | 'admin' | 'booking';
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">Nothing here yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Interviewee</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <div className="font-medium">{r.full_name}</div>
              <div className="text-xs text-muted-foreground">{r.phone ?? '—'} · {r.age ? `${r.age}y` : ''} {r.sex ?? ''}</div>
            </TableCell>
            <TableCell className="text-sm">
              <div>{[r.city, r.state].filter(Boolean).join(', ') || '—'}</div>
              {r.gps_lat != null && r.gps_lng != null && (
                <div className="text-xs text-muted-foreground">{Number(r.gps_lat).toFixed(3)}, {Number(r.gps_lng).toFixed(3)}</div>
              )}
            </TableCell>
            <TableCell><Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge></TableCell>
            <TableCell className="text-right">
              {mode === 'interviewer' && <InterviewerActions row={r} myLoc={myLoc} onRefresh={onRefresh} />}
              {mode === 'audit' && <FieldManagerActions row={r} onRefresh={onRefresh} />}
              {mode === 'booking' && <span className="text-xs text-muted-foreground">Booked {new Date(r.created_at).toLocaleDateString()}</span>}
              {mode === 'admin' && <span className="text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ------------------ Page ------------------

const OralGenWorkflow: React.FC = () => {
  const { user, role, capabilities } = useAuth();
  const [rows, setRows] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  const isAdmin = role === 'admin' || capabilities.includes('oralgen_admin');
  const canBook = isAdmin || capabilities.includes('oralgen_book');
  const canInterview = isAdmin || capabilities.includes('oralgen_interview');
  const canAudit = isAdmin || capabilities.includes('oralgen_audit');

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await db.from('oralgen_interviews').select('*').order('created_at', { ascending: false });
    if (!error) setRows((data as Interview[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  useEffect(() => {
    if (canInterview && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
      );
    }
  }, [canInterview]);

  const sortedByProximity = useMemo(() => {
    if (!myLoc) return rows;
    return [...rows].sort((a, b) => {
      const da = a.gps_lat != null && a.gps_lng != null ? distanceKm(myLoc, { lat: Number(a.gps_lat), lng: Number(a.gps_lng) }) : Number.POSITIVE_INFINITY;
      const db_ = b.gps_lat != null && b.gps_lng != null ? distanceKm(myLoc, { lat: Number(b.gps_lat), lng: Number(b.gps_lng) }) : Number.POSITIVE_INFINITY;
      return da - db_;
    });
  }, [rows, myLoc]);

  const myBookings = rows.filter((r) => r.created_by === user?.id);
  const interviewPool = sortedByProximity.filter((r) => r.status === 'pending_interview');
  const myInterviews = rows.filter((r) => r.interviewer_id === user?.id && r.status === 'in_progress');
  const auditPool = rows.filter((r) => r.status === 'awaiting_audit');
  const myAudits = rows.filter((r) => r.field_manager_id === user?.id && r.status === 'audit_in_progress');

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending_interview').length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    awaitingAudit: rows.filter((r) => r.status === 'awaiting_audit').length,
    completed: rows.filter((r) => r.status === 'completed').length,
  }), [rows]);

  const defaultTab = canBook ? 'bookings' : canInterview ? 'interviews' : canAudit ? 'audits' : 'all';

  return (
    <DashboardLayout title="OralGen Workflow">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Oral Genealogy Workflow</h2>
          <p className="text-muted-foreground text-sm">Book, interview, audit and track oral genealogy field jobs.</p>
        </div>
        {canBook && <BookingForm onSaved={fetchRows} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pending', value: stats.pending },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Awaiting Audit', value: stats.awaitingAudit },
          { label: 'Completed', value: stats.completed },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{s.label}</div><div className="text-2xl font-bold">{s.value}</div></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto">
          {canBook && <TabsTrigger value="bookings"><Camera className="h-4 w-4 mr-1" /> My Bookings</TabsTrigger>}
          {canInterview && <TabsTrigger value="interviews"><Users className="h-4 w-4 mr-1" /> Interviews</TabsTrigger>}
          {canAudit && <TabsTrigger value="audits"><Gavel className="h-4 w-4 mr-1" /> Audits</TabsTrigger>}
          <TabsTrigger value="all">All Records</TabsTrigger>
        </TabsList>

        {canBook && (
          <TabsContent value="bookings" className="mt-4">
            <Card><CardHeader><CardTitle>My Bookings</CardTitle><CardDescription>Interviews you created.</CardDescription></CardHeader>
              <CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> :
                <InterviewTable rows={myBookings} myLoc={null} onRefresh={fetchRows} mode="booking" />}</CardContent>
            </Card>
          </TabsContent>
        )}

        {canInterview && (
          <TabsContent value="interviews" className="mt-4 space-y-4">
            <Card><CardHeader><CardTitle>Available Jobs</CardTitle><CardDescription>{myLoc ? 'Sorted by proximity to your location.' : 'Enable location for proximity sorting.'}</CardDescription></CardHeader>
              <CardContent><InterviewTable rows={interviewPool} myLoc={myLoc} onRefresh={fetchRows} mode="interviewer" /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>My Active Interviews</CardTitle><CardDescription>Complete within 24 hours of accepting.</CardDescription></CardHeader>
              <CardContent><InterviewTable rows={myInterviews} myLoc={myLoc} onRefresh={fetchRows} mode="interviewer" /></CardContent>
            </Card>
          </TabsContent>
        )}

        {canAudit && (
          <TabsContent value="audits" className="mt-4 space-y-4">
            <Card><CardHeader><CardTitle>Audit Pool</CardTitle><CardDescription>Interviews awaiting audit.</CardDescription></CardHeader>
              <CardContent><InterviewTable rows={auditPool} myLoc={null} onRefresh={fetchRows} mode="audit" /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>My Active Audits</CardTitle><CardDescription>Complete within 48 hours of the scheduled audit date.</CardDescription></CardHeader>
              <CardContent><InterviewTable rows={myAudits} myLoc={null} onRefresh={fetchRows} mode="audit" /></CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="all" className="mt-4">
          <Card><CardHeader><CardTitle>All Records</CardTitle><CardDescription>Every interview you have access to.</CardDescription></CardHeader>
            <CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> :
              <InterviewTable rows={rows} myLoc={myLoc} onRefresh={fetchRows} mode="admin" />}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default OralGenWorkflow;
