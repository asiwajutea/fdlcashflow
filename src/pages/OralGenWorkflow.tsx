import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { OralGenBookingForm } from '@/components/oralgen/OralGenBookingForm';
import { PrefPicker } from '@/components/oralgen/PrefPicker';
import { StarRating } from '@/components/oralgen/StarRating';
import { PhotoCapture } from '@/components/oralgen/PhotoCapture';
import { OralGenOverview } from '@/components/oralgen/OralGenOverview';
import { STATE_LIST, NIGERIA_STATES } from '@/lib/nigeria-states-cities';
import {
  MapPin, Clock, Upload, FileText, Archive, CheckCircle2,
  Loader2, ClipboardList, Users, Gavel, Camera, Navigation,
  Search, X, Pencil, Plus, ChevronLeft, ChevronRight,
  ChevronDown, SlidersHorizontal, Trash2, BarChart2,
} from 'lucide-react';

type Status =
  | 'draft'
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
  interview_pref: string[] | null;
  booking_acceptance_rating: number | null;
  assigned_by: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<Status, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:             { label: 'Draft',            variant: 'outline' },
  pending_interview: { label: 'Pending Interview', variant: 'secondary' },
  in_progress:       { label: 'In Progress',       variant: 'default' },
  awaiting_audit:    { label: 'Awaiting Audit',    variant: 'secondary' },
  audit_in_progress: { label: 'Audit In Progress', variant: 'default' },
  completed:         { label: 'Completed',          variant: 'outline' },
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

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total === 0) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  // Build page pills — show up to 5 around current page with ellipsis
  const pills: (number | '…')[] = [];
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pills.push(i);
  } else {
    pills.push(1);
    if (page > 3) pills.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pills.push(i);
    if (page < lastPage - 2) pills.push('…');
    pills.push(lastPage);
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 pt-3 pb-1 text-sm text-muted-foreground">
      <span>Showing {start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ‹ Prev
        </Button>
        {pills.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onPage(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= lastPage}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </Button>
      </div>
    </div>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

interface FilterBarProps {
  rows: Interview[];
  myLoc: { lat: number; lng: number } | null;
  onFiltered: (result: Interview[]) => void;
}

type SortKey =
  | 'newest'
  | 'oldest'
  | 'name_az'
  | 'name_za'
  | 'age_asc'
  | 'age_desc'
  | 'proximity_asc'
  | 'rating_desc';

function FilterBar({ rows, myLoc, onFiltered }: FilterBarProps) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [sex, setSex] = useState('all');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [proximity, setProximity] = useState('any');
  const [rating, setRating] = useState('any');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [mobileOpen, setMobileOpen] = useState(false);

  const allStates = useMemo(() => {
    // Use STATE_LIST as the canonical list; filter to only states present in data
    const dataStates = new Set<string>();
    rows.forEach((r) => { if (r.state) dataStates.add(r.state); });
    return STATE_LIST.filter((s) => dataStates.has(s));
  }, [rows]);

  const clearAll = () => {
    setSearch(''); setState('all'); setSex('all');
    setMinAge(''); setMaxAge(''); setProximity('any');
    setRating('any'); setSortKey('newest');
  };

  // Re-apply filters whenever any control or rows change
  useEffect(() => {
    let result = [...rows];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          r.state?.toLowerCase().includes(q),
      );
    }

    // State
    if (state !== 'all') result = result.filter((r) => r.state === state);

    // Sex
    if (sex !== 'all') result = result.filter((r) => r.sex?.toLowerCase() === sex.toLowerCase());

    // Age range
    if (minAge !== '') result = result.filter((r) => r.age != null && r.age >= Number(minAge));
    if (maxAge !== '') result = result.filter((r) => r.age != null && r.age <= Number(maxAge));

    // Proximity
    if (proximity !== 'any' && myLoc) {
      const km = Number(proximity);
      result = result.filter((r) => {
        if (r.gps_lat == null || r.gps_lng == null) return false;
        return distanceKm(myLoc, { lat: Number(r.gps_lat), lng: Number(r.gps_lng) }) < km;
      });
    }

    // Acceptance rating
    if (rating !== 'any') {
      const minRating = Number(rating);
      result = result.filter(
        (r) => (r.booking_acceptance_rating ?? r.acceptance_rating ?? 0) >= minRating,
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_az':
          return (a.full_name ?? '').localeCompare(b.full_name ?? '');
        case 'name_za':
          return (b.full_name ?? '').localeCompare(a.full_name ?? '');
        case 'age_asc':
          return (a.age ?? 9999) - (b.age ?? 9999);
        case 'age_desc':
          return (b.age ?? -1) - (a.age ?? -1);
        case 'proximity_asc': {
          if (!myLoc) return 0;
          const da =
            a.gps_lat != null && a.gps_lng != null
              ? distanceKm(myLoc, { lat: Number(a.gps_lat), lng: Number(a.gps_lng) })
              : Number.POSITIVE_INFINITY;
          const db_ =
            b.gps_lat != null && b.gps_lng != null
              ? distanceKm(myLoc, { lat: Number(b.gps_lat), lng: Number(b.gps_lng) })
              : Number.POSITIVE_INFINITY;
          return da - db_;
        }
        case 'rating_desc': {
          const ra = b.booking_acceptance_rating ?? b.acceptance_rating ?? 0;
          const rb = a.booking_acceptance_rating ?? a.acceptance_rating ?? 0;
          return ra - rb;
        }
        default:
          return 0;
      }
    });

    onFiltered(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, state, sex, minAge, maxAge, proximity, rating, sortKey, rows, myLoc]);

  const hasFilters =
    search !== '' ||
    state !== 'all' ||
    sex !== 'all' ||
    minAge !== '' ||
    maxAge !== '' ||
    proximity !== 'any' ||
    rating !== 'any' ||
    sortKey !== 'newest';

  return (
    <div className="space-y-3 pb-4">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        <p className="text-xs text-muted-foreground">{rows.length} result{rows.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMobileOpen(v => !v)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {hasFilters ? 'Filters (active)' : 'Filter & Sort'}
        </Button>
      </div>

      {/* Filter controls — always visible on desktop, toggleable on mobile */}
      <div className={`space-y-2 ${mobileOpen ? 'block' : 'hidden'} md:block`}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search name, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* State */}
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {allStates.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sex */}
        <Select value={sex} onValueChange={setSex}>
          <SelectTrigger className="h-8 text-sm w-28">
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>

        {/* Age range */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            placeholder="Min age"
            className="h-8 text-sm w-20"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            min="0"
            placeholder="Max age"
            className="h-8 text-sm w-20"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
          />
        </div>

        {/* Proximity — only when location is available */}
        {myLoc && (
          <Select value={proximity} onValueChange={setProximity}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any distance</SelectItem>
              <SelectItem value="5">&lt; 5 km</SelectItem>
              <SelectItem value="10">&lt; 10 km</SelectItem>
              <SelectItem value="25">&lt; 25 km</SelectItem>
              <SelectItem value="50">&lt; 50 km</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Acceptance rating */}
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any rating</SelectItem>
            <SelectItem value="1">1★ and above</SelectItem>
            <SelectItem value="2">2★ and above</SelectItem>
            <SelectItem value="3">3★ and above</SelectItem>
            <SelectItem value="4">4★ and above</SelectItem>
            <SelectItem value="5">5★ only</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name_az">Name A→Z</SelectItem>
            <SelectItem value="name_za">Name Z→A</SelectItem>
            <SelectItem value="age_asc">Age ↑</SelectItem>
            <SelectItem value="age_desc">Age ↓</SelectItem>
            {myLoc && <SelectItem value="proximity_asc">Proximity ↑</SelectItem>}
            <SelectItem value="rating_desc">Rating ↓</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}

// ── LazyRow ───────────────────────────────────────────────────────────────────

function LazyRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLTableRowElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <tr
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(8px)',
        transition: 'opacity 0.2s, transform 0.2s',
      }}
    >
      {children}
    </tr>
  );
}

// ── FilteredTable (self-contained: FilterBar + InterviewTable + Pagination) ───

function FilteredTable({
  rows,
  myLoc,
  onRefresh,
  mode,
  currentUserId,
  canAdminDelete,
}: {
  rows: Interview[];
  myLoc: { lat: number; lng: number } | null;
  onRefresh: () => void;
  mode: 'interviewer' | 'audit' | 'admin' | 'booking';
  currentUserId?: string | null;
  canAdminDelete?: boolean;
}) {
  const [filtered, setFiltered] = useState<Interview[]>(rows);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [rows]);

  const handleFiltered = useCallback((result: Interview[]) => {
    setFiltered(result);
    setPage(1);
  }, []);

  const stableRefresh = useCallback(onRefresh, [onRefresh]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <FilterBar rows={rows} myLoc={myLoc} onFiltered={handleFiltered} />
      <InterviewTable rows={pageRows} myLoc={myLoc} onRefresh={stableRefresh} mode={mode} currentUserId={currentUserId} canAdminDelete={canAdminDelete} />
      <Pagination total={filtered.length} page={page} onPage={setPage} />
    </div>
  );
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
  const [fromPendingFlag, setFromPendingFlag] = useState(false);
  const [pdf, setPdf] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [totalNames, setTotalNames] = useState('');
  const [auditPrefs, setAuditPrefs] = useState<string[]>([]);
  const [acceptanceRating, setAcceptanceRating] = useState(0);

  const FOLDER_PATTERN = /^[A-Z]{2}\d+_\d+_\d{8}_\d+$/;

  const resetCompletionFields = () => {
    setFolderName(''); setTotalNames(''); setAuditPrefs([]); setAcceptanceRating(0);
    setPdf(null); setZip(null);
  };

  const openComplete = (fromPending: boolean) => {
    resetCompletionFields();
    setFromPendingFlag(fromPending);
    setUploadOpen(true);
  };

  /** Lock + set in_progress */
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

  const uploadAndComplete = async (fromPending = false) => {
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
      const now = new Date().toISOString();
      const { error } = await db.from('oralgen_interviews').update({
        pdf_url: pdfPath,
        zip_url: zipPath,
        folder_name: folderName.trim(),
        total_names: Number(totalNames),
        audit_pref: auditPrefs,
        acceptance_rating: acceptanceRating,
        interview_completed_at: now,
        // When skipping lock, stamp interviewer fields in the same write
        ...(fromPending ? {
          interviewer_id: user.id,
          interviewer_accepted_at: now,
          interview_deadline: null,
        } : {}),
        status: 'awaiting_audit',
      }).eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Interview completed — moved to audit queue' });
      setUploadOpen(false);
      resetCompletionFields();
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  /** Drop locked interview — release back to pool */
  const drop = async () => {
    if (!confirm('Drop this interview? It will be released back to the available pool.')) return;
    setBusy(true);
    const { error } = await db.from('oralgen_interviews').update({
      interviewer_id: null,
      interviewer_accepted_at: null,
      interview_deadline: null,
      status: 'pending_interview',
    }).eq('id', row.id).eq('interviewer_id', user!.id);
    setBusy(false);
    if (error) return toast({ title: 'Could not drop', description: error.message, variant: 'destructive' });
    toast({ title: 'Interview dropped — back in pool' });
    onRefresh();
  };

  const dist = myLoc && row.gps_lat != null && row.gps_lng != null
    ? distanceKm(myLoc, { lat: Number(row.gps_lat), lng: Number(row.gps_lng) })
    : null;

  if (row.status === 'pending_interview') {
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {dist !== null && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {dist.toFixed(1)} km</Badge>}
        <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>View Details</Button>
        <Button size="sm" variant="outline"
          className="gap-1 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
          onClick={() => openComplete(true)} disabled={busy}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Interviewed
        </Button>
        <Button size="sm" onClick={accept} disabled={busy}>Accept</Button>

        {/* Skip-lock completion dialog */}
        <Dialog open={uploadOpen && fromPendingFlag} onOpenChange={(o) => { if (!o) { setUploadOpen(false); resetCompletionFields(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Mark as Interviewed (skip lock)</DialogTitle></DialogHeader>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg px-3 py-2">
              Recording this interview directly — locking step skipped. Will move straight to audit queue.
            </p>
            <CompletionForm folderName={folderName} setFolderName={setFolderName} totalNames={totalNames}
              setTotalNames={setTotalNames} auditPrefs={auditPrefs} setAuditPrefs={setAuditPrefs}
              acceptanceRating={acceptanceRating} setAcceptanceRating={setAcceptanceRating}
              setPdf={setPdf} setZip={setZip} FOLDER_PATTERN={FOLDER_PATTERN} />
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); resetCompletionFields(); }}>Cancel</Button>
              <Button onClick={() => uploadAndComplete(true)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Interview'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Booking details dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Booking Details <Badge variant="secondary" className="text-xs">Pending Interview</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <Section title="Interviewee">
                <DetailRow label="Full Name" value={row.full_name} />
                <DetailRow label="Age" value={row.age != null ? `${row.age} yrs` : null} />
                <DetailRow label="Sex" value={row.sex} />
                <DetailRow label="Phone" value={row.phone} />
              </Section>
              <Section title="Location">
                {dist !== null && <DetailRow label="Distance from you" value={`${dist.toFixed(1)} km`} highlight />}
                <DetailRow label="Address" value={[row.address, row.city, row.state].filter(Boolean).join(', ')} />
                {row.gps_lat != null && row.gps_lng != null && (
                  <DetailRow label="GPS" value={`${Number(row.gps_lat).toFixed(5)}, ${Number(row.gps_lng).toFixed(5)}`}
                    extra={<a href={`https://maps.google.com/?q=${row.gps_lat},${row.gps_lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline ml-2">Open map</a>} />
                )}
              </Section>
              {row.interview_pref && row.interview_pref.length > 0 && (
                <Section title="Interview Preferences">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {row.interview_pref.map((p) => <span key={p} className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium border border-primary/20">{p}</span>)}
                  </div>
                </Section>
              )}
              {row.booking_acceptance_rating != null && row.booking_acceptance_rating > 0 && (
                <Section title="Booker's Acceptance Rating"><StarDisplay value={row.booking_acceptance_rating} /></Section>
              )}
              {row.notes && <Section title="Notes"><p className="text-muted-foreground">{row.notes}</p></Section>}
              {(row.individual_photo_url || row.home_photo_url || row.path_photo_url) && (
                <Section title="Photos">
                  <InterviewerPhotoPreview row={row} />
                </Section>
              )}
              <Section title="Booking Info"><DetailRow label="Booked" value={new Date(row.created_at).toLocaleString()} /></Section>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button onClick={() => { setDetailsOpen(false); accept(); }} disabled={busy}>
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Accepting…</> : 'Accept Interview'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (row.status === 'in_progress' && row.interviewer_id === user?.id) {
    const isAssigned = !!row.assigned_at;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {isAssigned
          ? <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs gap-1">Assigned</Badge>
          : <Badge variant="secondary" className="text-xs gap-1">Self-accepted</Badge>
        }
        <Countdown deadline={row.interview_deadline} />
        <Button size="sm" variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={drop} disabled={busy}>
          Drop
        </Button>
        <Button size="sm" onClick={() => openComplete(false)} disabled={busy}>
          <Upload className="h-4 w-4 mr-1" /> Complete
        </Button>

        {/* Normal completion dialog */}
        <Dialog open={uploadOpen && !fromPendingFlag} onOpenChange={(o) => { if (!o) { setUploadOpen(false); resetCompletionFields(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Complete Interview</DialogTitle></DialogHeader>
            <CompletionForm folderName={folderName} setFolderName={setFolderName} totalNames={totalNames}
              setTotalNames={setTotalNames} auditPrefs={auditPrefs} setAuditPrefs={setAuditPrefs}
              acceptanceRating={acceptanceRating} setAcceptanceRating={setAcceptanceRating}
              setPdf={setPdf} setZip={setZip} FOLDER_PATTERN={FOLDER_PATTERN} />
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); resetCompletionFields(); }}>Cancel</Button>
              <Button onClick={() => uploadAndComplete(false)} disabled={busy}>
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

// ── Shared completion form fields (used in both skip-lock and normal dialogs) ──

function CompletionForm({ folderName, setFolderName, totalNames, setTotalNames, auditPrefs, setAuditPrefs, acceptanceRating, setAcceptanceRating, setPdf, setZip, FOLDER_PATTERN }: {
  folderName: string; setFolderName: (v: string) => void;
  totalNames: string; setTotalNames: (v: string) => void;
  auditPrefs: string[]; setAuditPrefs: (v: string[]) => void;
  acceptanceRating: number; setAcceptanceRating: (v: number) => void;
  setPdf: (f: File | null) => void; setZip: (f: File | null) => void;
  FOLDER_PATTERN: RegExp;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Interview Folder Name <span className="text-destructive">*</span></Label>
        <Input placeholder="e.g. NG71_650_20260502_1234" value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className={folderName && !FOLDER_PATTERN.test(folderName) ? 'border-destructive' : ''} />
        <p className="text-xs text-muted-foreground">Pattern: <code className="bg-muted px-1 rounded">XX00_000_YYYYMMDD_0000</code></p>
        {folderName && !FOLDER_PATTERN.test(folderName) && <p className="text-xs text-destructive">Invalid format.</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Total Names <span className="text-destructive">*</span></Label>
        <Input type="number" min="1" placeholder="e.g. 12" value={totalNames} onChange={(e) => setTotalNames(e.target.value)} />
        <p className="text-xs text-muted-foreground">Total individuals recorded in this interview.</p>
      </div>
      <PrefPicker label="Preferred Audit Day / Time" required value={auditPrefs} onChange={setAuditPrefs} />
      <StarRating label="Interviewee Acceptance Rating" required value={acceptanceRating} onChange={setAcceptanceRating} helpText="How willing was the interviewee to participate?" />
      <hr className="border-border" />
      <div><Label>Scanned PDF <span className="text-xs text-muted-foreground">(max 20MB, optional)</span></Label><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
      <div><Label>Zipped Mobile Data <span className="text-xs text-muted-foreground">(max 50MB, optional)</span></Label><Input type="file" accept=".zip,application/zip" onChange={(e) => setZip(e.target.files?.[0] ?? null)} /></div>
    </div>
  );
}

function FieldManagerActions({ row, onRefresh }: { row: Interview; onRefresh: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [skipLockOpen, setSkipLockOpen] = useState(false);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

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

  const openSkipLockDialog = () => {
    setEditName(row.full_name ?? '');
    setEditPhone(row.phone ?? '');
    setEditAge(row.age != null ? String(row.age) : '');
    setEditTotalNames(row.total_names != null ? String(row.total_names) : '');
    setSkipLockOpen(true);
  };

  /** Lock + schedule */
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

  /** Drop locked audit — release back to pool */
  const drop = async () => {
    if (!confirm('Drop this audit? It will be released back to the awaiting-audit pool.')) return;
    setBusy(true);
    const { error } = await db.from('oralgen_interviews').update({
      field_manager_id: null,
      audit_accepted_at: null,
      audit_scheduled_date: null,
      audit_deadline: null,
      status: 'awaiting_audit',
    }).eq('id', row.id).eq('field_manager_id', user!.id);
    setBusy(false);
    if (error) return toast({ title: 'Could not drop', description: error.message, variant: 'destructive' });
    toast({ title: 'Audit dropped — back in pool' });
    onRefresh();
  };

  const completeAudit = async (skipLock: boolean) => {
    if (!editName.trim()) return toast({ title: 'Name is required', variant: 'destructive' });
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await db.from('oralgen_interviews').update({
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      age: editAge ? Number(editAge) : null,
      total_names: editTotalNames ? Number(editTotalNames) : null,
      audit_completed_at: now,
      ...(skipLock ? {
        field_manager_id: user!.id,
        audit_accepted_at: now,
        audit_scheduled_date: null,
        audit_deadline: null,
      } : {}),
      status: 'completed',
    }).eq('id', row.id);
    setBusy(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Audit completed' });
    setCompleteOpen(false);
    setSkipLockOpen(false);
    onRefresh();
  };

  const downloadFile = async (path: string | null) => {
    const url = await signedUrl(path);
    if (!url) return toast({ title: 'File unavailable', variant: 'destructive' });
    window.open(url, '_blank');
  };

  // ── Shared audit completion fields ──
  const AuditFields = () => (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label>Interviewee Name <span className="text-destructive">*</span></Label>
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
      </div>
      <div className="space-y-1.5">
        <Label>Phone Number</Label>
        <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="e.g. 08012345678" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Age</Label>
          <Input type="number" min="1" max="120" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="e.g. 45" />
        </div>
        <div className="space-y-1.5">
          <Label>Total Names</Label>
          <Input type="number" min="1" value={editTotalNames} onChange={(e) => setEditTotalNames(e.target.value)} placeholder="e.g. 12" />
        </div>
      </div>
    </div>
  );

  if (row.status === 'awaiting_audit') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline"
          className="gap-1 text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
          onClick={openSkipLockDialog} disabled={busy}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Audited
        </Button>
        <Button size="sm" onClick={() => setOpen(true)} disabled={busy}>Accept Audit</Button>

        {/* Skip-lock audit dialog */}
        <Dialog open={skipLockOpen} onOpenChange={setSkipLockOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Mark as Audited (skip lock)</DialogTitle></DialogHeader>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg px-3 py-2">
              Recording this audit directly without locking. Will move straight to completed.
            </p>
            <AuditFields />
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setSkipLockOpen(false)}>Cancel</Button>
              <Button onClick={() => completeAudit(true)} disabled={busy || !editName.trim()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Submit Audit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lock & schedule dialog */}
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
      </div>
    );
  }

  if (row.status === 'audit_in_progress' && row.field_manager_id === user?.id) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Countdown deadline={row.audit_deadline} />
        {row.pdf_url && <Button size="sm" variant="outline" onClick={() => downloadFile(row.pdf_url)}><FileText className="h-4 w-4" /></Button>}
        {row.zip_url && <Button size="sm" variant="outline" onClick={() => downloadFile(row.zip_url)}><Archive className="h-4 w-4" /></Button>}
        <Button size="sm" variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={drop} disabled={busy}>
          Drop
        </Button>
        <Button size="sm" onClick={openCompleteDialog} disabled={busy}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
        </Button>

        {/* Normal completion dialog */}
        <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Complete Audit</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground -mt-1">Review and update details before marking as completed.</p>
            <AuditFields />
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
              <Button onClick={() => completeAudit(false)} disabled={busy || !editName.trim()}>
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving…</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as Completed</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ── Shared photo preview for interviewer details dialog ───────────────────────

function InterviewerPhotoPreview({ row }: { row: Interview }) {
  const { toast } = useToast();
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

  const openPhoto = async (path: string | null, label: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('oralgen-files').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast({ title: `Could not load ${label}`, variant: 'destructive' });
    setLightbox({ url: data.signedUrl, label });
  };

  const Thumb = ({ path, label }: { path: string | null; label: string }) => {
    if (!path) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <button type="button" onClick={() => openPhoto(path, label)}
          className="relative w-full rounded-lg overflow-hidden border bg-muted group"
          style={{ aspectRatio: '4/3' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:bg-primary/5 transition-colors">
            <Camera className="h-6 w-6" />
            <span className="text-xs font-medium">Tap to view</span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-1">
        <Thumb path={row.individual_photo_url} label="Individual Photo" />
        <Thumb path={row.home_photo_url}       label="Home Photo" />
        <Thumb path={row.path_photo_url}       label="Path to Home" />
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              {lightbox?.label}
            </DialogTitle>
          </DialogHeader>
          {lightbox?.url && (
            <img src={lightbox.url} alt={lightbox.label ?? ''} className="w-full object-contain max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------ Booking details (read-only, available from all statuses) ------------------

// ── Direct interview record (field agent creates + completes in one step) ─────

// Defined outside DirectInterviewForm so it's never recreated on re-renders.
// If EF were defined inside the component body, React would treat it as a new
// component type on every render and fully unmount/remount the inputs — causing
// the mobile keyboard to dismiss after each keystroke.
const EF: React.FC<{ label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }> = ({ label, required, hint, className, children }) => (
  <div className={`space-y-1.5 ${className ?? ''}`}>
    <Label className="flex items-center gap-1">{label}{required && <span className="text-destructive">*</span>}{hint && <span className="text-xs text-muted-foreground font-normal">({hint})</span>}</Label>
    {children}
  </div>
);

const DI_Q_ITEMS: { key: 'q_scholarship' | 'q_vocational' | 'q_high_school' | 'q_cooperative'; label: string }[] = [
  { key: 'q_scholarship', label: 'Does the household have any child or relative who has finished secondary school but has not yet enrolled in a university — and could benefit from a scholarship?' },
  { key: 'q_vocational',  label: 'Is there anyone in the household who could benefit from a vocational skills training or empowerment programme?' },
  { key: 'q_high_school', label: 'Does the household have any child or relative currently attending secondary school?' },
  { key: 'q_cooperative', label: 'Is the interviewee interested in joining a cooperative society that provides food relief to members?' },
];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

type DIFormState = {
  first_name: string; surname: string; other_names: string;
  age: string; sex: string; phone: string;
  house_number: string; address: string; city: string; state: string;
  notes: string; gps_lat: string; gps_lng: string;
  q_scholarship: boolean | null; q_vocational: boolean | null;
  q_high_school: boolean | null; q_cooperative: boolean | null;
};

/** Memoised personal-details step — prevents mobile keyboard from dismissing
 *  mid-keystroke when unrelated state (saving, step, etc.) changes in parent. */
const DIPersonalDetailsStep = React.memo(function DIPersonalDetailsStep({
  form,
  set,
}: {
  form: DIFormState;
  set: (patch: Partial<DIFormState>) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <EF label="First Name" required><Input value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} onBlur={(e) => set({ first_name: titleCase(e.target.value) })} placeholder="e.g. John" /></EF>
      <EF label="Surname" required><Input value={form.surname} onChange={(e) => set({ surname: e.target.value })} onBlur={(e) => set({ surname: titleCase(e.target.value) })} placeholder="e.g. Adeyemi" /></EF>
      <EF label="Other Names" hint="optional" className="sm:col-span-2"><Input value={form.other_names} onChange={(e) => set({ other_names: e.target.value })} onBlur={(e) => set({ other_names: titleCase(e.target.value) })} /></EF>
      <EF label="Age"><Input type="number" min="1" max="120" value={form.age} onChange={(e) => set({ age: e.target.value })} /></EF>
      <EF label="Sex" required>
        <Select value={form.sex} onValueChange={(v) => set({ sex: v })}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
        </Select>
      </EF>
      <EF label="Phone" className="sm:col-span-2"><Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. 08012345678" /></EF>
    </div>
  );
});

function DirectInterviewForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [step, setStep] = useState(0);

  // ── Booking fields ──
  const [form, setForm] = useState({
    first_name: '', surname: '', other_names: '',
    age: '', sex: '', phone: '',
    house_number: '', address: '', city: '', state: '',
    notes: '', gps_lat: '', gps_lng: '',
    q_scholarship: null as boolean | null,
    q_vocational:  null as boolean | null,
    q_high_school: null as boolean | null,
    q_cooperative: null as boolean | null,
  });
  const set = useCallback(
    (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch })),
    [],
  );
  const [interviewPrefs, setInterviewPrefs] = useState<string[]>([]);
  const [bookingRating, setBookingRating] = useState(0);
  const cities = form.state ? (NIGERIA_STATES[form.state] ?? []) : [];

  // ── Completion fields ──
  const FOLDER_PATTERN = /^[A-Z]{2}\d+_\d+_\d{8}_\d+$/;
  const [folderName, setFolderName] = useState('');
  const [totalNames, setTotalNames] = useState('');
  const [auditPrefs, setAuditPrefs] = useState<string[]>([]);
  const [completionRating, setCompletionRating] = useState(0);
  const [pdf, setPdf] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [photoIndividual, setPhotoIndividual] = useState<File | null>(null);
  const [photoHome, setPhotoHome] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState<File | null>(null);

  const STEPS = [
    { id: 'personal',       label: 'Personal Details' },
    { id: 'location',       label: 'Location' },
    { id: 'photos',         label: 'Photos' },
    { id: 'qualification',  label: 'Incentive Qualification' },
    { id: 'interview_data', label: 'Interview Data' },
    { id: 'preferences',    label: 'Preferences' },
  ];

  const reset = () => {
    setForm({ first_name:'',surname:'',other_names:'',age:'',sex:'',phone:'',house_number:'',address:'',city:'',state:'',notes:'',gps_lat:'',gps_lng:'',q_scholarship:null,q_vocational:null,q_high_school:null,q_cooperative:null });
    setInterviewPrefs([]); setBookingRating(0);
    setFolderName(''); setTotalNames(''); setAuditPrefs([]); setCompletionRating(0);
    setPdf(null); setZip(null);
    setPhotoIndividual(null); setPhotoHome(null); setPhotoPath(null);
    setStep(0);
  };

  const captureGps = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS not available', variant: 'destructive' });
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude;
        set({ gps_lat: String(lat), gps_lng: String(lng) });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
          if (res.ok) { const d = await res.json(); const auto = [d.address?.road ?? d.address?.suburb, d.address?.suburb ?? d.address?.neighbourhood].filter(Boolean).join(', '); if (auto) set({ address: auto }); }
        } catch { /* non-fatal */ }
        setGpsLoading(false);
      },
      () => { toast({ title: 'Could not read location', variant: 'destructive' }); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) { if (!form.first_name.trim()) return 'First name required'; if (!form.surname.trim()) return 'Surname required'; if (!form.sex) return 'Sex required'; }
    if (s === 1) { if (!form.state) return 'State required'; if (!form.city) return 'City required'; }
    if (s === 4) {
      if (!folderName.trim()) return 'Folder name required';
      if (!FOLDER_PATTERN.test(folderName.trim())) return 'Invalid folder name format (e.g. NG71_650_20260502_1234)';
      if (!totalNames || Number(totalNames) < 1) return 'Total names must be at least 1';
      if (auditPrefs.length === 0) return 'Select at least one preferred audit day/time';
      if (!completionRating) return 'Interviewee acceptance rating required';
    }
    if (s === 5) { if (!bookingRating) return 'Acceptance rating required'; }
    return null;
  };

  const nextStep = () => { const err = validateStep(step); if (err) return toast({ title: err, variant: 'destructive' }); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i++) { const err = validateStep(i); if (err) { setStep(i); return toast({ title: err, variant: 'destructive' }); } }
    if (!user) return;
    try {
      setSaving(true);
      const [indPath, homePath, pathPath, pdfPath, zipPath] = await Promise.all([
        photoIndividual ? uploadFile(photoIndividual, `photos/${user.id}`) : Promise.resolve(null),
        photoHome       ? uploadFile(photoHome,       `photos/${user.id}`) : Promise.resolve(null),
        photoPath       ? uploadFile(photoPath,       `photos/${user.id}`) : Promise.resolve(null),
        pdf ? uploadFile(pdf, `interviews/direct`) : Promise.resolve(null),
        zip ? uploadFile(zip, `interviews/direct`) : Promise.resolve(null),
      ]);
      const now = new Date().toISOString();
      const fullName = [form.first_name, form.surname, form.other_names].filter(Boolean).join(' ');
      const { error } = await db.from('oralgen_interviews').insert({
        created_by: user.id,
        full_name:   fullName,
        first_name:  form.first_name,
        surname:     form.surname,
        other_names: form.other_names || null,
        age:  form.age ? Number(form.age) : null,
        sex:  form.sex || null,
        phone: form.phone || null,
        house_number: form.house_number || null,
        address: form.address || null,
        city:    form.city    || null,
        state:   form.state   || null,
        gps_lat: form.gps_lat ? Number(form.gps_lat) : null,
        gps_lng: form.gps_lng ? Number(form.gps_lng) : null,
        individual_photo_url: indPath,
        home_photo_url:       homePath,
        path_photo_url:       pathPath,
        notes: form.notes || null,
        interview_pref: interviewPrefs.length ? interviewPrefs : null,
        booking_acceptance_rating: bookingRating || null,
        q_scholarship: form.q_scholarship,
        q_vocational:  form.q_vocational,
        q_high_school: form.q_high_school,
        q_cooperative: form.q_cooperative,
        // Completion data — skip pending/in_progress stages
        interviewer_id:          user.id,
        interviewer_accepted_at: now,
        interview_completed_at:  now,
        interview_deadline:      null,
        folder_name:   folderName.trim(),
        total_names:   Number(totalNames),
        audit_pref:    auditPrefs,
        acceptance_rating: completionRating,
        pdf_url: pdfPath,
        zip_url: zipPath,
        // Land directly in awaiting_audit
        status: 'awaiting_audit',
      });
      if (error) throw error;
      toast({ title: 'Interview recorded — awaiting audit' });
      setOpen(false);
      reset();
      onSaved();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { reset(); setOpen(true); }}>
        <Plus className="h-4 w-4" /> Record New Interview
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[94vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Record New Interview</span>
              <Badge variant="outline" className="text-xs font-normal">Step {step + 1} of {STEPS.length}</Badge>
            </DialogTitle>
            <div className="w-full bg-muted rounded-full h-1.5 mt-3">
              <div className="bg-primary rounded-full h-1.5 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <div className="flex mt-2 gap-1 flex-wrap">
              {STEPS.map((s, i) => (
                <button key={s.id} type="button" onClick={() => i < step && setStep(i)}
                  className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${i === step ? 'bg-primary text-primary-foreground font-semibold' : i < step ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-pointer' : 'bg-muted text-muted-foreground cursor-default'}`}>
                  {i < step ? '✓ ' : ''}{s.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {step === 0 && (
              <DIPersonalDetailsStep form={form} set={set} />
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs text-muted-foreground mb-1 block">GPS Coordinates</Label>
                    <Input readOnly value={form.gps_lat && form.gps_lng ? `${Number(form.gps_lat).toFixed(6)}, ${Number(form.gps_lng).toFixed(6)}` : ''} placeholder="Tap to capture" /></div>
                  <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={captureGps} disabled={gpsLoading}>
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}{gpsLoading ? 'Locating…' : 'Capture GPS'}
                  </Button>
                </div>
                <EF label="State" required>
                  <Select value={form.state} onValueChange={(v) => set({ state: v, city: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                    <SelectContent className="max-h-60">{STATE_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </EF>
                <EF label="City / LGA" required>
                  <Select value={form.city} onValueChange={(v) => set({ city: v })} disabled={!form.state}>
                    <SelectTrigger><SelectValue placeholder={form.state ? 'Select city…' : 'Pick state first'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </EF>
                <EF label="Street / Area" hint="auto-filled by GPS" className="sm:col-span-2">
                  <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street name or neighbourhood" />
                </EF>
                <EF label="House Number" hint="optional"><Input value={form.house_number} onChange={(e) => set({ house_number: e.target.value })} placeholder="e.g. 12B" /></EF>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Take photos of the interviewee, their home, and the path to it.</p>
                <PhotoCapture label="Individual Photo" required value={photoIndividual} onChange={setPhotoIndividual} defaultCamera="environment" />
                <PhotoCapture label="Home Photo" value={photoHome} onChange={setPhotoHome} defaultCamera="environment" />
                <PhotoCapture label="Path to Home" value={photoPath} onChange={setPhotoPath} defaultCamera="environment" />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {DI_Q_ITEMS.map(({ key, label }) => (
                  <div key={key} className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="text-sm leading-relaxed">{label}</p>
                    <div className="flex gap-2">
                      {([true, false] as const).map((opt) => (
                        <button key={String(opt)} type="button"
                          onClick={() => set({ [key]: (form[key] as boolean | null) === opt ? null : opt } as any)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form[key] === opt ? (opt ? 'bg-green-600 text-white border-green-600' : 'bg-destructive text-white border-destructive') : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                          {opt ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5 pt-1"><Label className="text-xs text-muted-foreground">Notes (optional)</Label><Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Any additional context…" /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter the interview completion details.</p>
                <div className="space-y-1.5">
                  <Label>Folder Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. NG71_650_20260502_1234" value={folderName} onChange={(e) => setFolderName(e.target.value)} className={folderName && !FOLDER_PATTERN.test(folderName) ? 'border-destructive' : ''} />
                  <p className="text-xs text-muted-foreground">Pattern: <code className="bg-muted px-1 rounded">XX00_000_YYYYMMDD_0000</code></p>
                  {folderName && !FOLDER_PATTERN.test(folderName) && <p className="text-xs text-destructive">Invalid format.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Total Names <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" placeholder="e.g. 12" value={totalNames} onChange={(e) => setTotalNames(e.target.value)} />
                </div>
                <PrefPicker label="Preferred Audit Day / Time" required value={auditPrefs} onChange={setAuditPrefs} />
                <StarRating label="Interviewee Acceptance Rating" required value={completionRating} onChange={setCompletionRating} helpText="How willing was the interviewee to participate?" />
                <hr className="border-border" />
                <div><Label>Scanned PDF <span className="text-xs text-muted-foreground">(max 20MB, optional)</span></Label><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
                <div><Label>Zipped Mobile Data <span className="text-xs text-muted-foreground">(max 50MB, optional)</span></Label><Input type="file" accept=".zip,application/zip" onChange={(e) => setZip(e.target.files?.[0] ?? null)} /></div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Record the interviewee's availability and response at booking time.</p>
                <PrefPicker label="Preferred Interview Day / Time" value={interviewPrefs} onChange={setInterviewPrefs} />
                <StarRating label="Booking Acceptance Rating" required value={bookingRating} onChange={setBookingRating} helpText="How willing was the interviewee to participate at the time of booking?" />
              </div>
            )}

          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" size="sm" onClick={prevStep} disabled={saving}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>}
              {step < STEPS.length - 1
                ? <Button size="sm" onClick={nextStep} disabled={saving}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                : <Button size="sm" onClick={submit} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Interview</>}
                  </Button>
              }
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Assign interviewer (managers / admins only) ───────────────────────────────

function AssignInterviewerButton({ row, onSaved }: { row: Interview; onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [interviewers, setInterviewers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  const loadInterviewers = async () => {
    const { data: caps } = await db.from('user_capabilities').select('user_id').eq('capability', 'oralgen_interview');
    const ids = (caps || []).map((c: any) => c.user_id);
    if (!ids.length) { setInterviewers([]); return; }
    const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', ids).eq('is_active', true).order('full_name');
    setInterviewers((profiles || []) as { id: string; full_name: string | null }[]);
  };

  const assign = async () => {
    if (!selectedId) return toast({ title: 'Select an interviewer', variant: 'destructive' });
    if (!user) return;
    setBusy(true);
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 3600 * 1000);
    const { error } = await db.from('oralgen_interviews').update({
      interviewer_id:          selectedId,
      interviewer_accepted_at: now.toISOString(),
      interview_deadline:      deadline.toISOString(),
      assigned_by:             user.id,
      assigned_at:             now.toISOString(),
      status:                  'in_progress',
    }).eq('id', row.id).eq('status', 'pending_interview');
    setBusy(false);
    if (error) return toast({ title: 'Assignment failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Interviewer assigned — 24h countdown started' });
    setOpen(false); setSelectedId(''); onSaved();
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
        onClick={() => { loadInterviewers(); setSelectedId(''); setOpen(true); }}>
        <Users className="h-3.5 w-3.5" /> Assign
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign to Interviewer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Assigning <span className="font-medium text-foreground">{row.full_name}</span> to an interviewer. They will have 24 hours to complete it.
            </p>
            <div className="space-y-1.5">
              <Label>Field Agent / Interviewer</Label>
              {interviewers.length === 0
                ? <p className="text-xs text-muted-foreground italic">No interviewers found with the required capability.</p>
                : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Select interviewer…" /></SelectTrigger>
                    <SelectContent>
                      {interviewers.map((i) => <SelectItem key={i.id} value={i.id}>{i.full_name || i.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={assign} disabled={busy || !selectedId}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Assigning…</> : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditBookingButton({ row, onSaved }: { row: Interview; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  const [form, setForm] = useState({
    first_name: '', surname: '', other_names: '',
    age: '', sex: '', phone: '',
    house_number: '', address: '', city: '', state: '',
    notes: '', gps_lat: '', gps_lng: '',
    q_scholarship: null as boolean | null,
    q_vocational:  null as boolean | null,
    q_high_school: null as boolean | null,
    q_cooperative: null as boolean | null,
  });
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const [interviewPrefs, setInterviewPrefs] = useState<string[]>([]);
  const [acceptanceRating, setAcceptanceRating] = useState(0);
  const [photoIndividual, setPhotoIndividual] = useState<File | null>(null);
  const [photoHome,       setPhotoHome]       = useState<File | null>(null);
  const [photoPath,       setPhotoPath]       = useState<File | null>(null);
  const cities = form.state ? (NIGERIA_STATES[form.state] ?? []) : [];

  const openEdit = () => {
    setForm({
      first_name:    (row as any).first_name   ?? row.full_name?.split(' ')[0] ?? '',
      surname:       (row as any).surname      ?? row.full_name?.split(' ')[1] ?? '',
      other_names:   (row as any).other_names  ?? '',
      age:           row.age != null ? String(row.age) : '',
      sex:           row.sex ?? '',
      phone:         row.phone ?? '',
      house_number:  (row as any).house_number ?? '',
      address:       row.address ?? '',
      city:          row.city    ?? '',
      state:         row.state   ?? '',
      notes:         row.notes   ?? '',
      gps_lat:       row.gps_lat != null ? String(row.gps_lat) : '',
      gps_lng:       row.gps_lng != null ? String(row.gps_lng) : '',
      q_scholarship: (row as any).q_scholarship ?? null,
      q_vocational:  (row as any).q_vocational  ?? null,
      q_high_school: (row as any).q_high_school ?? null,
      q_cooperative: (row as any).q_cooperative ?? null,
    });
    setInterviewPrefs((row as any).interview_pref ?? []);
    setAcceptanceRating(row.booking_acceptance_rating ?? 0);
    setPhotoIndividual(null);
    setPhotoHome(null);
    setPhotoPath(null);
    setOpen(true);
  };

  const captureGps = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS not available', variant: 'destructive' });
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude;
        set({ gps_lat: String(lat), gps_lng: String(lng) });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road ?? data.address?.suburb ?? '';
            const sub  = data.address?.suburb ?? data.address?.neighbourhood ?? '';
            const auto = [road, sub].filter(Boolean).join(', ');
            if (auto) set({ address: auto });
          }
        } catch { /* non-fatal */ }
        setGpsLoading(false);
      },
      () => { toast({ title: 'Could not read location', variant: 'destructive' }); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const save = async () => {
    if (!form.first_name.trim()) return toast({ title: 'First name is required', variant: 'destructive' });
    if (!form.surname.trim())    return toast({ title: 'Surname is required', variant: 'destructive' });
    if (!form.sex)               return toast({ title: 'Sex is required', variant: 'destructive' });
    if (!form.state)             return toast({ title: 'State is required', variant: 'destructive' });
    if (!form.city)              return toast({ title: 'City is required', variant: 'destructive' });
    if (!acceptanceRating)       return toast({ title: 'Acceptance rating is required', variant: 'destructive' });
    const fullName = [form.first_name, form.surname, form.other_names].filter(Boolean).join(' ');
    setSaving(true);

    // Upload any new photos; fall back to existing URLs if none taken
    let indPath   = row.individual_photo_url;
    let homePath  = row.home_photo_url;
    let pathPath_ = row.path_photo_url;
    try {
      if (photoIndividual) indPath   = await uploadFile(photoIndividual, `photos/${row.id}`);
      if (photoHome)       homePath  = await uploadFile(photoHome,       `photos/${row.id}`);
      if (photoPath)       pathPath_ = await uploadFile(photoPath,       `photos/${row.id}`);
    } catch (e: any) {
      setSaving(false);
      return toast({ title: 'Photo upload failed', description: e.message, variant: 'destructive' });
    }

    const { error } = await db.from('oralgen_interviews').update({
      full_name:   fullName,
      first_name:  form.first_name,
      surname:     form.surname,
      other_names: form.other_names || null,
      age:         form.age ? Number(form.age) : null,
      sex:         form.sex || null,
      phone:       form.phone || null,
      house_number: form.house_number || null,
      address:     form.address || null,
      city:        form.city    || null,
      state:       form.state   || null,
      gps_lat:     form.gps_lat ? Number(form.gps_lat) : null,
      gps_lng:     form.gps_lng ? Number(form.gps_lng) : null,
      individual_photo_url: indPath,
      home_photo_url:       homePath,
      path_photo_url:       pathPath_,
      notes:       form.notes   || null,
      interview_pref: interviewPrefs.length ? interviewPrefs : null,
      booking_acceptance_rating: acceptanceRating || null,
      q_scholarship: form.q_scholarship,
      q_vocational:  form.q_vocational,
      q_high_school: form.q_high_school,
      q_cooperative: form.q_cooperative,
    }).eq('id', row.id).in('status', ['pending_interview', 'draft']);
    setSaving(false);
    if (error) return toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    toast({ title: 'Booking updated' });
    setOpen(false);
    setPhotoIndividual(null); setPhotoHome(null); setPhotoPath(null);
    onSaved();
  };

  const EF: React.FC<{ label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }> = ({ label, required, hint, className, children }) => (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="flex items-center gap-1">
        {label}{required && <span className="text-destructive">*</span>}
        {hint && <span className="text-xs text-muted-foreground font-normal">({hint})</span>}
      </Label>
      {children}
    </div>
  );

  const ES: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><h4 className="text-sm font-semibold">{title}</h4><div className="flex-1 border-t" /></div>
      {children}
    </div>
  );

  const Q_ITEMS: { key: keyof typeof form; label: string }[] = [
    { key: 'q_scholarship', label: 'Does the household have any child or relative who has finished secondary school but has not yet enrolled in a university — and could benefit from a scholarship?' },
    { key: 'q_vocational',  label: 'Is there anyone in the household who could benefit from a vocational skills training or empowerment programme?' },
    { key: 'q_high_school', label: 'Does the household have any child or relative currently attending secondary school?' },
    { key: 'q_cooperative', label: 'Is the interviewee interested in joining a cooperative society that provides food relief to members?' },
  ];

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={openEdit}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              Edit Booking <Badge variant={row.status === 'draft' ? 'outline' : 'secondary'} className="text-xs font-normal">
                {row.status === 'draft' ? 'Draft' : 'Pending Interview'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            <ES title="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EF label="First Name" required><Input value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} onBlur={(e) => set({ first_name: titleCase(e.target.value) })} /></EF>
                <EF label="Surname" required><Input value={form.surname} onChange={(e) => set({ surname: e.target.value })} onBlur={(e) => set({ surname: titleCase(e.target.value) })} /></EF>
                <EF label="Other Names" hint="optional" className="sm:col-span-2"><Input value={form.other_names} onChange={(e) => set({ other_names: e.target.value })} onBlur={(e) => set({ other_names: titleCase(e.target.value) })} /></EF>
                <EF label="Age"><Input type="number" min="1" max="120" value={form.age} onChange={(e) => set({ age: e.target.value })} /></EF>
                <EF label="Sex" required>
                  <Select value={form.sex} onValueChange={(v) => set({ sex: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </EF>
                <EF label="Phone" className="sm:col-span-2"><Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. 08012345678" /></EF>
              </div>
            </ES>

            <ES title="Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">GPS Coordinates</Label>
                    <Input readOnly value={form.gps_lat && form.gps_lng ? `${Number(form.gps_lat).toFixed(6)}, ${Number(form.gps_lng).toFixed(6)}` : ''} placeholder="Tap to capture" />
                  </div>
                  <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={captureGps} disabled={gpsLoading}>
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    {gpsLoading ? 'Locating…' : 'Capture GPS'}
                  </Button>
                </div>
                <EF label="State" required>
                  <Select value={form.state} onValueChange={(v) => set({ state: v, city: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                    <SelectContent className="max-h-60">{STATE_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </EF>
                <EF label="City / LGA" required>
                  <Select value={form.city} onValueChange={(v) => set({ city: v })} disabled={!form.state}>
                    <SelectTrigger><SelectValue placeholder={form.state ? 'Select city…' : 'Pick state first'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </EF>
                <EF label="Street / Area" hint="auto-filled by GPS" className="sm:col-span-2">
                  <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street name or neighbourhood" />
                </EF>
                <EF label="House Number" hint="optional"><Input value={form.house_number} onChange={(e) => set({ house_number: e.target.value })} placeholder="e.g. 12B" /></EF>
              </div>
            </ES>

            <ES title="Photos">
              <p className="text-sm text-muted-foreground -mt-1">
                Take photos of the interviewee, their home, and the path to it.
                {row.individual_photo_url && ' Existing photos are kept unless you take new ones.'}
              </p>
              <PhotoCapture label="Individual Photo" value={photoIndividual} onChange={setPhotoIndividual} defaultCamera="environment" />
              <PhotoCapture label="Home Photo"       value={photoHome}       onChange={setPhotoHome}       defaultCamera="environment" />
              <PhotoCapture label="Path to Home"     value={photoPath}       onChange={setPhotoPath}       defaultCamera="environment" />
            </ES>

            <ES title="Incentive Qualification">
              {Q_ITEMS.map(({ key, label }) => (
                <div key={key} className="rounded-xl border bg-card p-4 space-y-3">
                  <p className="text-sm leading-relaxed">{label}</p>
                  <div className="flex gap-2">
                    {([true, false] as const).map((opt) => (
                      <button key={String(opt)} type="button"
                        onClick={() => set({ [key]: (form[key] as boolean | null) === opt ? null : opt } as any)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form[key] === opt
                            ? opt ? 'bg-green-600 text-white border-green-600' : 'bg-destructive text-white border-destructive'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}>
                        {opt ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </ES>

            <ES title="Interview Preferences">
              <PrefPicker label="Preferred Interview Day / Time" value={interviewPrefs} onChange={setInterviewPrefs} />
            </ES>

            <ES title="Interviewee Response">
              <StarRating label="Acceptance Rating" required value={acceptanceRating} onChange={setAcceptanceRating} helpText="How willing was the interviewee to participate?" />
            </ES>

            <ES title="Additional Notes">
              <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Any additional context…" />
            </ES>

          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BookingDetailsButton({ row, myLoc }: { row: Interview; myLoc: { lat: number; lng: number } | null }) {
  const [open, setOpen] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const { toast } = useToast();

  const dist = myLoc && row.gps_lat != null && row.gps_lng != null
    ? distanceKm(myLoc, { lat: Number(row.gps_lat), lng: Number(row.gps_lng) })
    : null;

  // Load display names for users referenced in timeline
  useEffect(() => {
    if (!open) return;
    const ids = [row.created_by, row.interviewer_id, row.field_manager_id].filter(Boolean) as string[];
    if (!ids.length) return;
    db.from('profiles').select('id, full_name').in('id', ids).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || p.id; });
      setUserNames(map);
    });
  }, [open, row.created_by, row.interviewer_id, row.field_manager_id]);

  const userName = (id: string | null) => (id ? (userNames[id] || id.slice(0, 8) + '…') : null);

  // Open a signed URL inline (lightbox) instead of new tab
  const openPhoto = async (path: string | null, label: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('oralgen-files').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast({ title: `Could not load ${label}`, variant: 'destructive' });
    setLightbox({ url: data.signedUrl, label });
  };

  const hasPhotos = !!(row.individual_photo_url || row.home_photo_url || row.path_photo_url);

  const PhotoThumb = ({ path, label }: { path: string | null; label: string }) => {
    if (!path) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => openPhoto(path, label)}
          className="relative w-full rounded-lg overflow-hidden border bg-muted group"
          style={{ aspectRatio: '4/3' }}
        >
          {/* We can't show a thumbnail from a storage path without a signed URL,
              so show a placeholder card that fetches on click */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:bg-primary/5 transition-colors">
            <Camera className="h-6 w-6" />
            <span className="text-xs font-medium">Tap to view</span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" /> Details
      </Button>

      {/* ── Main details dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Booking Details
              <Badge variant={STATUS_META[row.status].variant} className="text-xs">
                {STATUS_META[row.status].label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">

            <Section title="Interviewee">
              <DetailRow label="Full Name"  value={row.full_name} />
              <DetailRow label="Age"        value={row.age != null ? `${row.age} yrs` : null} />
              <DetailRow label="Sex"        value={row.sex} />
              <DetailRow label="Phone"      value={row.phone} />
            </Section>

            <Section title="Location">
              {dist !== null && <DetailRow label="Distance from you" value={`${dist.toFixed(1)} km`} highlight />}
              <DetailRow label="Address" value={[row.address, row.city, row.state].filter(Boolean).join(', ')} />
              {row.gps_lat != null && row.gps_lng != null && (
                <DetailRow
                  label="GPS"
                  value={`${Number(row.gps_lat).toFixed(5)}, ${Number(row.gps_lng).toFixed(5)}`}
                  extra={
                    <a href={`https://maps.google.com/?q=${row.gps_lat},${row.gps_lng}`}
                       target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary underline ml-2">
                      Open map
                    </a>
                  }
                />
              )}
            </Section>

            {row.interview_pref && row.interview_pref.length > 0 && (
              <Section title="Interview Preferences">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {row.interview_pref.map((p) => (
                    <span key={p} className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium border border-primary/20">{p}</span>
                  ))}
                </div>
              </Section>
            )}

            {row.booking_acceptance_rating != null && row.booking_acceptance_rating > 0 && (
              <Section title="Booker's Acceptance Rating">
                <StarDisplay value={row.booking_acceptance_rating} />
              </Section>
            )}

            {row.audit_pref && row.audit_pref.length > 0 && (
              <Section title="Preferred Audit Day / Time">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {row.audit_pref.map((p) => (
                    <span key={p} className="px-2.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium border border-amber-200">{p}</span>
                  ))}
                </div>
              </Section>
            )}

            {row.acceptance_rating != null && row.acceptance_rating > 0 && (
              <Section title="Interviewer's Acceptance Rating">
                <StarDisplay value={row.acceptance_rating ?? 0} />
              </Section>
            )}

            {row.folder_name && (
              <Section title="Interview Files">
                <DetailRow label="Folder"      value={row.folder_name} />
                <DetailRow label="Total Names" value={row.total_names != null ? String(row.total_names) : null} />
              </Section>
            )}

            {/* ── Photos inline ── */}
            {hasPhotos && (
              <Section title="Photos">
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <PhotoThumb path={row.individual_photo_url} label="Individual Photo" />
                  <PhotoThumb path={row.home_photo_url}       label="Home Photo" />
                  <PhotoThumb path={row.path_photo_url}       label="Path to Home" />
                </div>
              </Section>
            )}

            {row.notes && (
              <Section title="Notes">
                <p className="text-muted-foreground">{row.notes}</p>
              </Section>
            )}

            {/* ── Timeline with user names ── */}
            <Section title="Timeline">
              <div className="space-y-2 mt-1">
                <TimelineRow
                  label="Booked"
                  date={row.created_at}
                  user={userName(row.created_by)}
                />
                {row.interviewer_accepted_at && (
                  <TimelineRow
                    label="Interview accepted"
                    date={row.interviewer_accepted_at}
                    user={userName(row.interviewer_id)}
                  />
                )}
                {row.interview_completed_at && (
                  <TimelineRow
                    label="Interview completed"
                    date={row.interview_completed_at}
                    user={userName(row.interviewer_id)}
                  />
                )}
                {row.audit_accepted_at && (
                  <TimelineRow
                    label="Audit accepted"
                    date={row.audit_accepted_at}
                    user={userName(row.field_manager_id)}
                  />
                )}
                {row.audit_scheduled_date && (
                  <TimelineRow
                    label="Audit scheduled"
                    date={row.audit_scheduled_date}
                    user={userName(row.field_manager_id)}
                  />
                )}
                {row.audit_completed_at && (
                  <TimelineRow
                    label="Audit completed"
                    date={row.audit_completed_at}
                    user={userName(row.field_manager_id)}
                  />
                )}
              </div>
            </Section>

          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox dialog ── */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              {lightbox?.label}
            </DialogTitle>
          </DialogHeader>
          {lightbox?.url && (
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="w-full object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Delete any record (oralgen_admin / admin) ─────────────────────────────────

function AdminDeleteButton({ row, onDeleted }: { row: Interview; onDeleted: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    if (!confirm(`Permanently delete record for "${row.full_name}"?\n\nThis cannot be undone.`)) return;
    setBusy(true);
    const { error } = await db.from('oralgen_interviews').delete().eq('id', row.id);
    setBusy(false);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    toast({ title: 'Record deleted' });
    onDeleted();
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={doDelete}
      disabled={busy}
      title="Delete record"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </Button>
  );
}

// ── Delete draft booking ──────────────────────────────────────────────────────

function DraftDeleteButton({ row, onDeleted }: { row: Interview; onDeleted: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const deleteDraft = async () => {
    if (!confirm(`Delete draft booking for "${row.full_name}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await db.from('oralgen_interviews').delete().eq('id', row.id).eq('status', 'draft');
    setBusy(false);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    toast({ title: 'Draft deleted' });
    onDeleted();
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={deleteDraft}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </Button>
  );
}

// ------------------ List ------------------

// React.memo prevents InterviewTable from re-rendering when the parent FilteredTable
// updates its filtered state — this keeps EditBookingButton dialogs stable during typing.
const InterviewTable = React.memo(function InterviewTable({
  rows, myLoc, onRefresh, mode, currentUserId, canAdminDelete,
}: {
  rows: Interview[]; myLoc: { lat: number; lng: number } | null; onRefresh: () => void;
  mode: 'interviewer' | 'audit' | 'admin' | 'booking';
  currentUserId?: string | null;
  canAdminDelete?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">Nothing here yet.</p>;

  return (
    <>
      {/* MOBILE: accordion cards */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => {
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Tappable header */}
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                onClick={() => setOpenId(isOpen ? null : r.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[r.phone, r.age && `${r.age}y`, r.sex].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {/* Expandable body */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t space-y-3">
                  {/* Location */}
                  <div className="text-sm text-muted-foreground">
                    {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                    {r.gps_lat != null && r.gps_lng != null && (
                      <span className="block text-xs">{Number(r.gps_lat).toFixed(3)}, {Number(r.gps_lng).toFixed(3)}</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'pending_interview' && currentUserId && (
                      <AssignInterviewerButton row={r} onSaved={onRefresh} />
                    )}
                    {(r.status === 'pending_interview' || r.status === 'draft') && currentUserId &&
                      (r.created_by === currentUserId || (r as any).updated_by === currentUserId) && (
                      <EditBookingButton row={r} onSaved={onRefresh} />
                    )}
                    <BookingDetailsButton row={r} myLoc={myLoc} />
                    {mode === 'interviewer' && <InterviewerActions row={r} myLoc={myLoc} onRefresh={onRefresh} />}
                    {mode === 'audit'       && <FieldManagerActions row={r} onRefresh={onRefresh} />}
                    {mode === 'booking'     && r.status === 'draft' && currentUserId && r.created_by === currentUserId && (
                      <DraftDeleteButton row={r} onDeleted={onRefresh} />
                    )}
                    {mode === 'booking'     && r.status !== 'draft' && <span className="text-xs text-muted-foreground">Booked {new Date(r.created_at).toLocaleDateString()}</span>}
                    {mode === 'admin' && (
                      <>
                        <span className="text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</span>
                        {canAdminDelete && <AdminDeleteButton row={r} onDeleted={onRefresh} />}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="hidden md:block overflow-x-auto">
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
              <LazyRow key={r.id}>
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
                  <div className="flex items-center gap-1 justify-end">
                    {/* Assign — for managers/admins on pending rows */}
                    {r.status === 'pending_interview' && currentUserId && (
                      <AssignInterviewerButton row={r} onSaved={onRefresh} />
                    )}
                    {/* Edit — pending or draft rows owned by the current user */}
                    {(r.status === 'pending_interview' || r.status === 'draft') && currentUserId &&
                      (r.created_by === currentUserId || (r as any).updated_by === currentUserId) && (
                      <EditBookingButton row={r} onSaved={onRefresh} />
                    )}
                    {/* Details always visible regardless of mode/status */}
                    <BookingDetailsButton row={r} myLoc={myLoc} />
                    {/* Mode-specific actions */}
                    {mode === 'interviewer' && <InterviewerActions row={r} myLoc={myLoc} onRefresh={onRefresh} />}
                    {mode === 'audit'       && <FieldManagerActions row={r} onRefresh={onRefresh} />}
                    {mode === 'booking'     && r.status === 'draft' && currentUserId && r.created_by === currentUserId && (
                      <DraftDeleteButton row={r} onDeleted={onRefresh} />
                    )}
                    {mode === 'booking'     && r.status !== 'draft' && <span className="text-xs text-muted-foreground ml-1">Booked {new Date(r.created_at).toLocaleDateString()}</span>}
                    {mode === 'admin' && (
                      <>
                        <span className="text-xs text-muted-foreground ml-1">Updated {new Date(r.updated_at).toLocaleDateString()}</span>
                        {canAdminDelete && <AdminDeleteButton row={r} onDeleted={onRefresh} />}
                      </>
                    )}
                  </div>
                </TableCell>
              </LazyRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}); // end React.memo(InterviewTable)

// ------------------ Page ------------------

const OralGenWorkflow: React.FC = () => {
  const { user, role, capabilities } = useAuth();
  const [rows, setRows] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [myLocLabel, setMyLocLabel] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(false);
  const [userPosition, setUserPosition] = useState<string | null>(null);

  const isAdmin = role === 'admin' || capabilities.includes('oralgen_admin');
  const canBook = isAdmin || capabilities.includes('oralgen_book');
  const canInterview = isAdmin || capabilities.includes('oralgen_interview');
  const canAudit = isAdmin || capabilities.includes('oralgen_audit');

  const fetchRows = async () => {
    setLoading(true);
    const [{ data, error }, posResult] = await Promise.all([
      db.from('oralgen_interviews').select('*').order('created_at', { ascending: false }),
      user?.id
        ? db.from('profiles')
            .select('positions(name)')
            .eq('id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!error) setRows((data as Interview[]) ?? []);
    const posName = (posResult.data as any)?.positions?.name ?? null;
    setUserPosition(posName);
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

  const defaultTab = 'overview';

  return (
    <DashboardLayout title="OralGen Workflow">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Oral Genealogy Workflow</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-muted-foreground text-sm">Book, interview, audit and track oral genealogy field jobs.</p>
            {userPosition && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {userPosition}
              </span>
            )}
          </div>
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
          <TabsTrigger value="overview"><BarChart2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          {canBook && <TabsTrigger value="bookings"><Camera className="h-4 w-4 mr-1" /> My Bookings</TabsTrigger>}
          {canInterview && <TabsTrigger value="interviews"><Users className="h-4 w-4 mr-1" /> Interviews</TabsTrigger>}
          {canAudit && <TabsTrigger value="audits"><Gavel className="h-4 w-4 mr-1" /> Audits</TabsTrigger>}
          <TabsTrigger value="all">All Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {loading
            ? <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : <OralGenOverview rows={rows as any} isAdmin={isAdmin} />}
        </TabsContent>

        {canBook && (
          <TabsContent value="bookings" className="mt-4">
            <Card><CardHeader><CardTitle>My Bookings</CardTitle><CardDescription>Interviews you created.</CardDescription></CardHeader>
              <CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> :
                <FilteredTable rows={myBookings} myLoc={myLoc} onRefresh={fetchRows} mode="booking" currentUserId={user?.id} />}</CardContent>
            </Card>
          </TabsContent>
        )}

        {canInterview && (
          <TabsContent value="interviews" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <DirectInterviewForm onSaved={fetchRows} />
            </div>
            <Card><CardHeader><CardTitle>Available Jobs</CardTitle><CardDescription>{myLoc ? 'Sorted by proximity to your location.' : 'Enable location for proximity sorting.'}</CardDescription></CardHeader>
              <CardContent><FilteredTable rows={interviewPool} myLoc={myLoc} onRefresh={fetchRows} mode="interviewer" currentUserId={user?.id} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>My Active Interviews</CardTitle><CardDescription>Complete within 24 hours of accepting.</CardDescription></CardHeader>
              <CardContent><FilteredTable rows={myInterviews} myLoc={myLoc} onRefresh={fetchRows} mode="interviewer" currentUserId={user?.id} /></CardContent>
            </Card>
          </TabsContent>
        )}

        {canAudit && (
          <TabsContent value="audits" className="mt-4 space-y-4">
            <Card><CardHeader><CardTitle>Audit Pool</CardTitle><CardDescription>Interviews awaiting audit.</CardDescription></CardHeader>
              <CardContent><FilteredTable rows={auditPool} myLoc={myLoc} onRefresh={fetchRows} mode="audit" currentUserId={user?.id} /></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>My Active Audits</CardTitle><CardDescription>Complete within 48 hours of the scheduled audit date.</CardDescription></CardHeader>
              <CardContent><FilteredTable rows={myAudits} myLoc={myLoc} onRefresh={fetchRows} mode="audit" currentUserId={user?.id} /></CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="all" className="mt-4">
          <Card><CardHeader><CardTitle>All Records</CardTitle><CardDescription>Every interview you have access to.</CardDescription></CardHeader>
            <CardContent>{loading ? <Loader2 className="animate-spin mx-auto" /> :
              <FilteredTable rows={rows} myLoc={myLoc} onRefresh={fetchRows} mode="admin" currentUserId={user?.id} canAdminDelete={isAdmin} />}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

// ── Details dialog helpers ─────────────────────────────────────────────────

const StarDisplay: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-0.5 mt-1">
    {[1,2,3,4,5].map((n) => (
      <svg key={n} className={`h-5 w-5 ${value >= n ? 'text-primary fill-primary' : 'text-muted-foreground fill-none'}`}
           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ))}
    <span className="text-xs text-muted-foreground ml-2">{value}/5</span>
  </div>
);

const TimelineRow: React.FC<{ label: string; date: string; user?: string | null }> = ({ label, date, user }) => (
  <div className="flex items-start gap-3 pl-1">
    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/60 shrink-0" />
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-medium text-foreground text-xs">{label}</span>
        {user && <span className="text-xs text-muted-foreground">by {user}</span>}
      </div>
      <span className="text-xs text-muted-foreground">{new Date(date).toLocaleString()}</span>
    </div>
  </div>
);

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
