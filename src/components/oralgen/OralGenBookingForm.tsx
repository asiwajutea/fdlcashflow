import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { NIGERIA_STATES, STATE_LIST } from '@/lib/nigeria-states-cities';
import { PhotoCapture } from './PhotoCapture';
import { PrefPicker } from './PrefPicker';
import { StarRating } from './StarRating';
import { Plus, MapPin, Loader2, ChevronLeft, ChevronRight, Save, CheckCircle2 } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('oralgen-files').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Capitalise every word */
const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

const DRAFT_KEY = 'oralgen_booking_draft';

const EMPTY_FORM = {
  first_name: '', surname: '', other_names: '',
  age: '', sex: '', phone: '',
  house_number: '', address: '', city: '', state: '',
  notes: '', gps_lat: '', gps_lng: '',
  // qualification questions
  q_scholarship: null as boolean | null,
  q_vocational:  null as boolean | null,
  q_high_school: null as boolean | null,
  q_cooperative: null as boolean | null,
};

const STEPS = [
  { id: 'personal',      label: 'Personal Details' },
  { id: 'location',      label: 'Location' },
  { id: 'photos',        label: 'Photos' },
  { id: 'qualifications',label: 'Incentive Qualification' },
  { id: 'preferences',   label: 'Preferences & Rating' },
];

// ─── main component ───────────────────────────────────────────────────────────

interface Props { onSaved: () => void }

export const OralGenBookingForm: React.FC<Props> = ({ onSaved }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open,       setOpen]       = useState(false);
  const [step,       setStep]       = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [savingDraft,setSavingDraft]= useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [hasDraft,   setHasDraft]   = useState(false);

  const [form, setForm]   = useState(EMPTY_FORM);
  const set = useCallback(
    (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch })),
    [],
  );

  const [photoIndividual, setPhotoIndividual] = useState<File | null>(null);
  const [photoHome,       setPhotoHome]       = useState<File | null>(null);
  const [photoPath,       setPhotoPath]       = useState<File | null>(null);
  const [interviewPrefs,  setInterviewPrefs]  = useState<string[]>([]);
  const [acceptanceRating,setAcceptanceRating]= useState(0);

  const cities = form.state ? (NIGERIA_STATES[form.state] ?? []) : [];

  // ── Draft: load on open ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setHasDraft(true);
    } catch { /* ignore */ }
  }, []);

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.form)            setForm({ ...EMPTY_FORM, ...d.form });
      if (d.interviewPrefs)  setInterviewPrefs(d.interviewPrefs);
      if (d.acceptanceRating) setAcceptanceRating(d.acceptanceRating);
      if (d.step != null)    setStep(d.step);
      toast({ title: 'Draft restored' });
    } catch { /* ignore */ }
  };

  // ── Auto-save draft on every change ─────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, interviewPrefs, acceptanceRating, step }));
        setHasDraft(true);
      } catch { /* ignore quota errors */ }
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form, interviewPrefs, acceptanceRating, step, open]);

  // ── Manual save as draft ─────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!user) return;
    setSavingDraft(true);
    try {
      const fullName = [form.first_name, form.surname, form.other_names].filter(Boolean).join(' ');
      await db.from('oralgen_interviews').insert({
        created_by: user.id,
        full_name:  fullName || 'Draft',
        first_name: form.first_name || null,
        surname:    form.surname    || null,
        other_names:form.other_names|| null,
        age:        form.age ? Number(form.age) : null,
        sex:        form.sex  || null,
        phone:      form.phone|| null,
        house_number: form.house_number || null,
        address:    form.address || null,
        city:       form.city    || null,
        state:      form.state   || null,
        gps_lat:    form.gps_lat ? Number(form.gps_lat) : null,
        gps_lng:    form.gps_lng ? Number(form.gps_lng) : null,
        notes:      form.notes   || null,
        interview_pref: interviewPrefs.length ? interviewPrefs : null,
        booking_acceptance_rating: acceptanceRating || null,
        q_scholarship: form.q_scholarship,
        q_vocational:  form.q_vocational,
        q_high_school: form.q_high_school,
        q_cooperative: form.q_cooperative,
        status:    'draft',
        is_draft:  true,
      });
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      // Stay on the form — don't reset or close.
      // Photos must be taken while the form is open; they cannot be saved to DB without uploading.
      toast({
        title: 'Draft saved',
        description: 'Your progress is saved. Continue adding photos or submit when ready.',
      });
      // Do NOT call onSaved() here — it would re-render the parent page and
      // reset the dialog scroll position. The list refreshes on close/submit.
    } catch (e: any) {
      toast({ title: 'Could not save draft', description: e.message, variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  // ── GPS + reverse geocode ────────────────────────────────────────────────
  const captureGps = () => {
    if (!navigator.geolocation)
      return toast({ title: 'GPS not available on this device', variant: 'destructive' });
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        set({ gps_lat: String(lat), gps_lng: String(lng) });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (res.ok) {
            const data = await res.json();
            const road   = data.address?.road   ?? data.address?.suburb ?? '';
            const suburb = data.address?.suburb  ?? data.address?.neighbourhood ?? '';
            const auto   = [road, suburb].filter(Boolean).join(', ');
            if (auto) set({ address: auto });
          }
        } catch { /* non-fatal */ }
        setGpsLoading(false);
      },
      () => { toast({ title: 'Could not read location', variant: 'destructive' }); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setForm(EMPTY_FORM);
    setPhotoIndividual(null);
    setPhotoHome(null);
    setPhotoPath(null);
    setInterviewPrefs([]);
    setAcceptanceRating(0);
    setStep(0);
  };

  // ── Per-step validation ──────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.first_name.trim()) return 'First name is required';
      if (!form.surname.trim())    return 'Surname is required';
      if (!form.sex)               return 'Sex is required';
    }
    if (s === 1) {
      if (!form.state) return 'State is required';
      if (!form.city)  return 'City is required';
    }
    if (s === 4) {
      if (!acceptanceRating) return 'Acceptance rating is required';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) return toast({ title: err, variant: 'destructive' });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  // ── Final submit ─────────────────────────────────────────────────────────
  const submit = async () => {
    // validate all steps
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) { setStep(i); return toast({ title: err, variant: 'destructive' }); }
    }
    if (!user) return;

    try {
      setSaving(true);
      const [indPath, homePath, pathPath] = await Promise.all([
        photoIndividual ? uploadPhoto(photoIndividual, `photos/${user.id}`) : Promise.resolve(null),
        photoHome       ? uploadPhoto(photoHome,       `photos/${user.id}`) : Promise.resolve(null),
        photoPath       ? uploadPhoto(photoPath,       `photos/${user.id}`) : Promise.resolve(null),
      ]);

      const fullName = [form.first_name, form.surname, form.other_names].filter(Boolean).join(' ');

      const { error } = await db.from('oralgen_interviews').insert({
        created_by: user.id,
        full_name:  fullName,
        first_name: form.first_name,
        surname:    form.surname,
        other_names:form.other_names || null,
        age:        form.age ? Number(form.age) : null,
        sex:        form.sex  || null,
        phone:      form.phone|| null,
        house_number: form.house_number || null,
        address:    form.address || null,
        city:       form.city    || null,
        state:      form.state   || null,
        gps_lat:    form.gps_lat ? Number(form.gps_lat) : null,
        gps_lng:    form.gps_lng ? Number(form.gps_lng) : null,
        individual_photo_url: indPath,
        home_photo_url:       homePath,
        path_photo_url:       pathPath,
        notes:      form.notes || null,
        interview_pref: interviewPrefs.length ? interviewPrefs : null,
        booking_acceptance_rating: acceptanceRating || null,
        q_scholarship: form.q_scholarship,
        q_vocational:  form.q_vocational,
        q_high_school: form.q_high_school,
        q_cooperative: form.q_cooperative,
        status:    'pending_interview',
        is_draft:  false,
      });

      if (error) throw error;
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      toast({ title: 'Booking created successfully' });
      setOpen(false);
      reset();
      onSaved();
    } catch (e: any) {
      toast({ title: 'Error creating booking', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Booking
        </Button>
        {hasDraft && (
          <Button variant="outline" size="sm" className="gap-1.5 text-amber-700 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => { setOpen(true); loadDraft(); }}>
            <Save className="h-3.5 w-3.5" /> Resume Draft
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[94vh] flex flex-col p-0 gap-0">

          {/* ── Header ── */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>New Interview Booking</span>
              <Badge variant="outline" className="text-xs font-normal">
                Step {step + 1} of {STEPS.length}
              </Badge>
            </DialogTitle>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-1.5 mt-3">
              <div
                className="bg-primary rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            {/* Step labels */}
            <div className="flex mt-2 gap-1 flex-wrap">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => i < step && setStep(i)} // can go back to completed steps
                  className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                    i === step
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : i < step
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-pointer'
                        : 'bg-muted text-muted-foreground cursor-default'
                  }`}
                >
                  {i < step ? '✓ ' : ''}{s.label}
                </button>
              ))}
            </div>
          </DialogHeader>

          {/* ── Body (scrollable) ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ══ STEP 0: Personal Details ════════════════════════════════ */}
            {step === 0 && (
              <div className="space-y-4">
                <StepHeading title="Personal Details" subtitle="Basic information about the interviewee" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name" required>
                    <Input
                      value={form.first_name}
                      onChange={(e) => set({ first_name: e.target.value })}
                      onBlur={(e) => set({ first_name: titleCase(e.target.value) })}
                      placeholder="e.g. John"
                    />
                  </Field>
                  <Field label="Surname" required>
                    <Input
                      value={form.surname}
                      onChange={(e) => set({ surname: e.target.value })}
                      onBlur={(e) => set({ surname: titleCase(e.target.value) })}
                      placeholder="e.g. Adeyemi"
                    />
                  </Field>
                  <Field label="Other Names" hint="optional" className="sm:col-span-2">
                    <Input
                      value={form.other_names}
                      onChange={(e) => set({ other_names: e.target.value })}
                      onBlur={(e) => set({ other_names: titleCase(e.target.value) })}
                      placeholder="Middle name(s)"
                    />
                  </Field>
                  <Field label="Age">
                    <Input type="number" min="1" max="120"
                      value={form.age} onChange={(e) => set({ age: e.target.value })}
                      placeholder="e.g. 45" />
                  </Field>
                  <Field label="Sex" required>
                    <Select value={form.sex} onValueChange={(v) => set({ sex: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Phone Number" className="sm:col-span-2">
                    <Input type="tel" value={form.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                      placeholder="e.g. 08012345678" />
                  </Field>
                </div>
              </div>
            )}

            {/* ══ STEP 1: Location ════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-4">
                <StepHeading title="Location" subtitle="Capture GPS and address details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* GPS */}
                  <div className="sm:col-span-2 flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">GPS Coordinates</Label>
                      <Input readOnly
                        value={form.gps_lat && form.gps_lng
                          ? `${Number(form.gps_lat).toFixed(6)}, ${Number(form.gps_lng).toFixed(6)}`
                          : ''}
                        placeholder="Tap button to capture" />
                    </div>
                    <Button type="button" variant="outline" className="gap-1.5 shrink-0"
                      onClick={captureGps} disabled={gpsLoading}>
                      {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      {gpsLoading ? 'Locating…' : 'Capture GPS'}
                    </Button>
                  </div>
                  <Field label="State" required>
                    <Select value={form.state} onValueChange={(v) => set({ state: v, city: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {STATE_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="City / LGA" required>
                    <Select value={form.city} onValueChange={(v) => set({ city: v })} disabled={!form.state}>
                      <SelectTrigger><SelectValue placeholder={form.state ? 'Select city…' : 'Pick state first'} /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Street / Area" hint="auto-filled by GPS" className="sm:col-span-2">
                    <Input value={form.address}
                      onChange={(e) => set({ address: e.target.value })}
                      placeholder="Street name or neighbourhood" />
                  </Field>
                  <Field label="House Number" hint="optional">
                    <Input value={form.house_number}
                      onChange={(e) => set({ house_number: e.target.value })}
                      placeholder="e.g. 12B" />
                  </Field>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Photos ══════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-4">
                <StepHeading title="Photos" subtitle="Take photos of the interviewee, their home, and the path to it" />
                <PhotoCapture label="Individual Photo" required value={photoIndividual} onChange={setPhotoIndividual} defaultCamera="environment" />
                <PhotoCapture label="Home Photo"       value={photoHome}       onChange={setPhotoHome}       defaultCamera="environment" />
                <PhotoCapture label="Path to Home"     value={photoPath}       onChange={setPhotoPath}       defaultCamera="environment" />
              </div>
            )}

            {/* ══ STEP 3: Qualifications ══════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-4">
                <StepHeading
                  title="Incentive Qualification"
                  subtitle="Help us understand how the interviewee's household can benefit from our programmes"
                />
                <YesNoField
                  label="Does the household have any child or relative who has finished secondary school but has not yet enrolled in a university — and could benefit from a scholarship?"
                  value={form.q_scholarship}
                  onChange={(v) => set({ q_scholarship: v })}
                />
                <YesNoField
                  label="Is there anyone in the household who could benefit from a vocational skills training or empowerment programme?"
                  value={form.q_vocational}
                  onChange={(v) => set({ q_vocational: v })}
                />
                <YesNoField
                  label="Does the household have any child or relative currently attending secondary school?"
                  value={form.q_high_school}
                  onChange={(v) => set({ q_high_school: v })}
                />
                <YesNoField
                  label="Is the interviewee interested in joining a cooperative society that provides food relief to members?"
                  value={form.q_cooperative}
                  onChange={(v) => set({ q_cooperative: v })}
                />
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs text-muted-foreground">Additional Notes (optional)</Label>
                  <Textarea rows={3} value={form.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    placeholder="Any extra context or observations…" />
                </div>
              </div>
            )}

            {/* ══ STEP 4: Preferences & Rating ════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-5">
                <StepHeading
                  title="Preferences & Rating"
                  subtitle="Record the interviewee's availability and how willing they were to participate"
                />
                <PrefPicker
                  label="Preferred Interview Day / Time"
                  value={interviewPrefs}
                  onChange={setInterviewPrefs}
                />
                <StarRating
                  label="Acceptance Rating"
                  required
                  value={acceptanceRating}
                  onChange={setAcceptanceRating}
                  helpText="How willing was the interviewee to participate?"
                />
              </div>
            )}

          </div>

          {/* ── Footer ── */}
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-2">
            {/* Left: cancel + draft */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm"
                onClick={() => { setOpen(false); reset(); }} disabled={saving || savingDraft}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={saveDraft} disabled={saving || savingDraft}>
                {savingDraft
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Save className="h-3.5 w-3.5" />}
                Save Draft
              </Button>
            </div>

            {/* Right: prev / next / submit */}
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={prevStep} disabled={saving}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button size="sm" onClick={nextStep} disabled={saving}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={submit} disabled={saving}>
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</>
                    : <><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Booking</>}
                </Button>
              )}
            </div>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── sub-components ───────────────────────────────────────────────────────────

const StepHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="flex-1 border-t" />
    </div>
    {children}
  </div>
);

const Field: React.FC<{
  label: string; required?: boolean; hint?: string;
  className?: string; children: React.ReactNode;
}> = ({ label, required, hint, className, children }) => (
  <div className={`space-y-1.5 ${className ?? ''}`}>
    <Label className="flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
      {hint && <span className="text-xs text-muted-foreground font-normal">({hint})</span>}
    </Label>
    {children}
  </div>
);

/** Yes / No toggle for qualification questions */
const YesNoField: React.FC<{
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}> = ({ label, value, onChange }) => (
  <div className="rounded-xl border bg-card p-4 space-y-3">
    <p className="text-sm text-foreground leading-relaxed">{label}</p>
    <div className="flex gap-2">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            value === opt
              ? opt
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-destructive text-white border-destructive'
              : 'bg-background text-foreground border-border hover:bg-muted'
          }`}
        >
          {opt ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  </div>
);
