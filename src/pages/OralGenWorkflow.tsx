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
import { OralGenBookingForm } from '@/components/oralgen/OralGenBookingForm';
import { PrefPicker } from '@/components/oralgen/PrefPicker';
import { StarRating } from '@/components/oralgen/StarRating';
import {
  MapPin, Clock, Upload, FileText, Archive, CheckCircle2,
  Loader2, ClipboardList, Users, Gavel, Camera, Navigation,
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
  folder_name: string | null;
  total_names: number | null;
  audit_pref: string[] | null;
  acceptance_rating: number | null;
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

// ------------------ Row actions ------------------

function InterviewerActions({ row, myLoc, onRefresh }: { row: Interview; myLoc: { lat: number; lng: number } | null; onRefresh: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Completion fields
  const [folderName, setFolderName] = useState('');
  const [totalNames, setTotalNames] = useState('');
  const [auditPrefs, setAuditPrefs] = useState<string[]>([]);
  const [acceptanceRating, setAcceptanceRating] = useState(0);

  const FOLDER_PATTERN = /^[A-Z]{2}\d+_\d+_\d{8}_\d+$/;

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

    // Validate required completion fields
    if (!folderName.trim()) return toast({ title: 'Folder name is required', variant: 'destructive' });
    if (!FOLDER_PATTERN.test(folderName.trim())) {
      return toast({ title: 'Invalid folder name format', description: 'Must follow pattern: NG71_650_20260502_1234', variant: 'destructive' });
    }
    if (!totalNames || Number(totalNames) < 1) return toast({ title: 'Total names must be at least 1', variant: 'destructive' });
    if (auditPrefs.length === 0) return toast({ title: 'Select at least one preferred audit day/time', variant: 'destructive' });
    if (acceptanceRating < 1) return toast({ title: 'Please rate the interviewee acceptance', variant: 'destructive' });

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
        folder_name: folderName.trim(),
        total_names: Number(totalNames),
        audit_pref: auditPrefs,
        acceptance_rating: acceptanceRating,
        interview_completed_at: new Date().toISOString(),
        status: 'awaiting_audit',
      }).eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Interview completed — moved to audit queue' });
      setUploadOpen(false);
      // Reset fields
      setFolderName(''); setTotalNames(''); setAuditPrefs([]); setAcceptanceRating(0);
      setPdf(null); setZip(null);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const [detailsOpen, setDetailsOpen] = useState(false);

  const dist = myLoc && row.gps_lat != null && row.gps_lng != null
    ? distanceKm(myLoc, { lat: Number(row.gps_lat), lng: Number(row.gps_lng) })
    : null;

  if (row.status === 'pending_interview') {
    return (
      <div className="flex items-center gap-2">
        {dist !== null && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {dist.toFixed(1)} km</Badge>}
        <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>
          View Details
        </Button>
        <Button size="sm" onClick={accept} disabled={busy}>Accept</Button>

        {/* Booking details dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Booking Details
                <Badge variant="secondary" className="text-xs">Pending Interview</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">

              {/* Name */}
              <Section title="Interviewee">
                <DetailRow label="Full Name" value={row.full_name} />
                <DetailRow label="Age" value={row.age != null ? `${row.age} yrs` : null} />
                <DetailRow label="Sex" value={row.sex} />
                <DetailRow label="Phone" value={row.phone} />
              </Section>

              {/* Location */}
              <Section title="Location">
                {dist !== null && (
                  <DetailRow label="Distance from you" value={`${dist.toFixed(1)} km`} highlight />
                )}
                <DetailRow label="Address" value={[row.address, row.city, row.state].filter(Boolean).join(', ')} />
                {row.gps_lat != null && row.gps_lng != null && (
                  <DetailRow
                    label="GPS"
                    value={`${Number(row.gps_lat).toFixed(5)}, ${Number(row.gps_lng).toFixed(5)}`}
                    extra={
                      <a
                        href={`https://maps.google.com/?q=${row.gps_lat},${row.gps_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline ml-2"
                      >
                        Open map
                      </a>
                    }
                  />
                )}
              </Section>

              {/* Interview preferences */}
              {row.interview_pref && row.interview_pref.length > 0 && (
                <Section title="Interview Preferences">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {row.interview_pref.map((p) => (
                      <span key={p} className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium border border-primary/20">{p}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Acceptance rating at booking */}
              {(row as any).booking_acceptance_rating > 0 && (
                <Section title="Booker's Acceptance Rating">
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map((n) => (
                      <svg key={n} className={`h-5 w-5 ${(row as any).booking_acceptance_rating >= n ? 'text-primary fill-primary' : 'text-muted-foreground fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{(row as any).booking_acceptance_rating}/5</span>
                  </div>
                </Section>
              )}

              {/* Photos */}
              {(row.individual_photo_url || row.home_photo_url || row.path_photo_url) && (
                <Section title="Photos">
                  <PhotoLinks row={row} />
                </Section>
              )}

              {/* Notes */}
              {row.notes && (
                <Section title="Notes">
                  <p className="text-muted-foreground">{row.notes}</p>
                </Section>
              )}

              {/* Booked */}
              <Section title="Booking Info">
                <DetailRow label="Booked" value={new Date(row.created_at).toLocaleString()} />
              </Section>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button
                onClick={() => { setDetailsOpen(false); accept(); }}
                disabled={busy}
              >
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Accepting…</> : 'Accept Interview'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setFolderName(''); setTotalNames(''); setAuditPrefs([]); setAcceptanceRating(0); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Complete Interview</DialogTitle></DialogHeader>
            <div className="space-y-4">

              {/* ── 1. Folder name ── */}
              <div className="space-y-1.5">
                <Label>Interview Folder Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. NG71_650_20260502_1234"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className={folderName && !FOLDER_PATTERN.test(folderName) ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Pattern: <code className="bg-muted px-1 rounded">XX00_000_YYYYMMDD_0000</code> — e.g. NG71_650_20260502_1234
                </p>
                {folderName && !FOLDER_PATTERN.test(folderName) && (
                  <p className="text-xs text-destructive">Invalid format. Use the pattern above.</p>
                )}
              </div>

              {/* ── 2. Total names ── */}
              <div className="space-y-1.5">
                <Label>Total Names <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 12"
                  value={totalNames}
                  onChange={(e) => setTotalNames(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Total number of individuals recorded in this interview.</p>
              </div>

              {/* ── 3. Preferred audit day/time ── */}
              <PrefPicker
                label="Preferred Audit Day / Time"
                required
                value={auditPrefs}
                onChange={setAuditPrefs}
              />

              {/* ── 4. Acceptance rating ── */}
              <StarRating
                label="Interviewee Acceptance Rating"
                required
                value={acceptanceRating}
                onChange={setAcceptanceRating}
                helpText="How willing was the interviewee to participate?"
              />

              <hr className="border-border" />

              {/* ── Files (optional) ── */}
              <div><Label>Scanned PDF <span className="text-xs text-muted-foreground">(max 20MB, optional)</span></Label><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Zipped Mobile Data <span className="text-xs text-muted-foreground">(max 50MB, optional)</span></Label><Input type="file" accept=".zip,application/zip" onChange={(e) => setZip(e.target.files?.[0] ?? null)} /></div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={uploadAndComplete} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Completed'}
              </Button>
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
  const [completeOpen, setCompleteOpen] = useState(false);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  // Editable fields pre-populated from the row
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editTotalNames, setEditTotalNames] = useState('');

  const openCompleteDialog = () => {
    setEditName(row.full_name ?? '');
    setEditPhone(row.phone ?? '');
    setEditAge(row.age != null ? String(row.age) : '');
    setEditTotalNames(row.total_names != null ? String(row.total_names) : '');
    setCompleteOpen(true);
  };

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
    if (!editName.trim()) return toast({ title: 'Name is required', variant: 'destructive' });
    setBusy(true);
    const { error } = await db.from('oralgen_interviews').update({
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      age: editAge ? Number(editAge) : null,
      total_names: editTotalNames ? Number(editTotalNames) : null,
      audit_completed_at: new Date().toISOString(),
      status: 'completed',
    }).eq('id', row.id);
    setBusy(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Audit completed' });
    setCompleteOpen(false);
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
        <Button size="sm" onClick={openCompleteDialog}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
        </Button>

        {/* Complete audit dialog */}
        <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Audit</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground -mt-1">
              Review and update the details below before marking this audit as completed.
            </p>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Interviewee Name <span className="text-destructive">*</span></Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="e.g. 45"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Names</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editTotalNames}
                    onChange={(e) => setEditTotalNames(e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
              <Button onClick={complete} disabled={busy || !editName.trim()}>
                {busy
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving…</>
                  : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as Completed</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  const [myLocLabel, setMyLocLabel] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(false);

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
    if (!navigator.geolocation) return;
    setLocLoading(true);
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setMyLoc({ lat, lng });
        // Reverse geocode via Nominatim (no API key)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (res.ok) {
            const data = await res.json();
            const a = data.address ?? {};
            const parts = [
              a.road ?? a.suburb ?? a.neighbourhood,
              a.city ?? a.town ?? a.village ?? a.county,
              a.state,
            ].filter(Boolean);
            setMyLocLabel(parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || null);
          }
        } catch { /* non-fatal — coords still set */ }
        setLocLoading(false);
      },
      () => { setLocError(true); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, []);

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
        {canBook && <OralGenBookingForm onSaved={fetchRows} />}
      </div>

      {/* ── My current location ─────────────────────────────────────── */}
      <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 text-sm
        ${myLoc ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                : locError ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
                           : 'bg-muted/30 border-border'}`}>
        {locLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Detecting your location…</span></>
        ) : locError ? (
          <><MapPin className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">
              Location unavailable — proximity distances cannot be calculated.
              <span className="ml-1 text-xs opacity-70">Allow location access and refresh.</span>
            </span></>
        ) : myLoc ? (
          <>
            <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-blue-700 dark:text-blue-300">Your location: </span>
              <span className="text-foreground">
                {myLocLabel ?? `${myLoc.lat.toFixed(5)}, ${myLoc.lng.toFixed(5)}`}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({myLoc.lat.toFixed(5)}, {myLoc.lng.toFixed(5)})
              </span>
            </div>
            <a
              href={`https://maps.google.com/?q=${myLoc.lat},${myLoc.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline shrink-0 hover:text-blue-800"
            >
              Open map
            </a>
          </>
        ) : null}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total',          value: stats.total },
          { label: 'Pending',        value: stats.pending },
          { label: 'In Progress',    value: stats.inProgress },
          { label: 'Awaiting Audit', value: stats.awaitingAudit },
          { label: 'Completed',      value: stats.completed },
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

// ── Details dialog helpers ─────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
    <div className="space-y-1 pl-1">{children}</div>
  </div>
);

const DetailRow: React.FC<{
  label: string;
  value?: string | null;
  highlight?: boolean;
  extra?: React.ReactNode;
}> = ({ label, value, highlight, extra }) => {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={`font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
      {extra}
    </div>
  );
};

function PhotoLinks({ row }: { row: Interview }) {
  const { toast } = useToast();
  const open = async (path: string | null, name: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('oralgen-files').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast({ title: `Could not load ${name}`, variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  };
  return (
    <div className="flex gap-2 flex-wrap mt-1">
      {row.individual_photo_url && (
        <button type="button" onClick={() => open(row.individual_photo_url, 'individual photo')}
          className="text-xs text-primary underline">Individual photo</button>
      )}
      {row.home_photo_url && (
        <button type="button" onClick={() => open(row.home_photo_url, 'home photo')}
          className="text-xs text-primary underline">Home photo</button>
      )}
      {row.path_photo_url && (
        <button type="button" onClick={() => open(row.path_photo_url, 'path photo')}
          className="text-xs text-primary underline">Path to home</button>
      )}
    </div>
  );
}

export default OralGenWorkflow;
