import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';
import { NIGERIA_STATES, STATE_LIST } from '@/lib/nigeria-states-cities';
import { PhotoCapture } from './PhotoCapture';
import { PrefPicker } from './PrefPicker';
import { StarRating } from './StarRating';
import { Plus, MapPin, Loader2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('oralgen-files').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

const EMPTY_FORM = {
  first_name: '',
  surname: '',
  other_names: '',
  age: '',
  sex: '',
  phone: '',
  house_number: '',
  address: '',   // auto-filled by GPS reverse geocode (best-effort)
  city: '',
  state: '',
  notes: '',
  gps_lat: '',
  gps_lng: '',
};

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  onSaved: () => void;
}

export const OralGenBookingForm: React.FC<Props> = ({ onSaved }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  const [photoIndividual, setPhotoIndividual] = useState<File | null>(null);
  const [photoHome, setPhotoHome] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState<File | null>(null);

  const [interviewPrefs, setInterviewPrefs] = useState<string[]>([]);
  const [acceptanceRating, setAcceptanceRating] = useState(0);

  const cities = form.state ? (NIGERIA_STATES[form.state] ?? []) : [];

  // ── GPS + reverse geocode ─────────────────────────────────────────────────
  const captureGps = () => {
    if (!navigator.geolocation)
      return toast({ title: 'GPS not available on this device', variant: 'destructive' });
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        set({ gps_lat: String(lat), gps_lng: String(lng) });

        // Best-effort reverse geocode via Nominatim (no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road ?? data.address?.suburb ?? '';
            const suburb = data.address?.suburb ?? data.address?.neighbourhood ?? '';
            const autoAddress = [road, suburb].filter(Boolean).join(', ');
            if (autoAddress) set({ address: autoAddress });
          }
        } catch { /* non-fatal */ }

        setGpsLoading(false);
      },
      () => {
        toast({ title: 'Could not read location', variant: 'destructive' });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setForm(EMPTY_FORM);
    setPhotoIndividual(null);
    setPhotoHome(null);
    setPhotoPath(null);
    setInterviewPrefs([]);
    setAcceptanceRating(0);
  };

  // ── validation ────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.first_name.trim()) return 'First name is required';
    if (!form.surname.trim()) return 'Surname is required';
    if (!form.sex) return 'Sex is required';
    if (!form.state) return 'State is required';
    if (!form.city) return 'City is required';
    return null;
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    const err = validate();
    if (err) return toast({ title: err, variant: 'destructive' });
    if (!user) return;

    try {
      setSaving(true);
      const [indPath, homePath, pathPath] = await Promise.all([
        photoIndividual ? uploadPhoto(photoIndividual, `photos/${user.id}`) : Promise.resolve(null),
        photoHome       ? uploadPhoto(photoHome,       `photos/${user.id}`) : Promise.resolve(null),
        photoPath       ? uploadPhoto(photoPath,       `photos/${user.id}`) : Promise.resolve(null),
      ]);

      const fullName = [form.first_name.trim(), form.surname.trim(), form.other_names.trim()]
        .filter(Boolean).join(' ');

      const { error } = await db.from('oralgen_interviews').insert({
        created_by: user.id,
        full_name: fullName,
        first_name: form.first_name.trim(),
        surname: form.surname.trim(),
        other_names: form.other_names.trim() || null,
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        phone: form.phone || null,
        house_number: form.house_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city || null,
        state: form.state || null,
        gps_lat: form.gps_lat ? Number(form.gps_lat) : null,
        gps_lng: form.gps_lng ? Number(form.gps_lng) : null,
        individual_photo_url: indPath,
        home_photo_url: homePath,
        path_photo_url: pathPath,
        notes: form.notes.trim() || null,
        interview_pref: interviewPrefs.length ? interviewPrefs : null,
        booking_acceptance_rating: acceptanceRating || null,
        status: 'pending_interview',
      });

      if (error) throw error;
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

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-2" /> New Booking
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Interview Booking</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">

            {/* ── SECTION: Personal details ──────────────────────────────── */}
            <Section title="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First Name" required>
                  <Input value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} placeholder="e.g. John" />
                </Field>
                <Field label="Surname" required>
                  <Input value={form.surname} onChange={(e) => set({ surname: e.target.value })} placeholder="e.g. Doe" />
                </Field>
                <Field label="Other Names" hint="optional" className="sm:col-span-2">
                  <Input value={form.other_names} onChange={(e) => set({ other_names: e.target.value })} placeholder="Middle name(s)" />
                </Field>
                <Field label="Age">
                  <Input type="number" min="1" max="120" value={form.age} onChange={(e) => set({ age: e.target.value })} placeholder="e.g. 45" />
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
                  <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. 08012345678" />
                </Field>
              </div>
            </Section>

            {/* ── SECTION: Location ──────────────────────────────────────── */}
            <Section title="Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GPS row */}
                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">GPS Coordinates</Label>
                    <Input
                      readOnly
                      value={form.gps_lat && form.gps_lng ? `${Number(form.gps_lat).toFixed(6)}, ${Number(form.gps_lng).toFixed(6)}` : ''}
                      placeholder="Tap button to capture"
                    />
                  </div>
                  <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={captureGps} disabled={gpsLoading}>
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    {gpsLoading ? 'Locating…' : 'Capture GPS'}
                  </Button>
                </div>

                {/* State → City cascade */}
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

                {/* Address auto-filled from GPS, editable */}
                <Field label="Street / Area" hint="auto-filled by GPS" className="sm:col-span-2">
                  <Input
                    value={form.address}
                    onChange={(e) => set({ address: e.target.value })}
                    placeholder="Street name or neighbourhood"
                  />
                </Field>
                <Field label="House Number" hint="optional">
                  <Input value={form.house_number} onChange={(e) => set({ house_number: e.target.value })} placeholder="e.g. 12B" />
                </Field>
              </div>
            </Section>

            {/* ── SECTION: Photos ────────────────────────────────────────── */}
            <Section title="Photos">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PhotoCapture label="Individual Photo" required value={photoIndividual} onChange={setPhotoIndividual} defaultCamera="user" />
                <PhotoCapture label="Home Photo" value={photoHome} onChange={setPhotoHome} defaultCamera="environment" />
                <PhotoCapture label="Path to Home" value={photoPath} onChange={setPhotoPath} defaultCamera="environment" />
              </div>
            </Section>

            {/* ── SECTION: Interview preferences ─────────────────────────── */}
            <Section title="Interview Preferences">
              <PrefPicker
                label="Preferred Interview Day / Time"
                value={interviewPrefs}
                onChange={setInterviewPrefs}
              />
            </Section>

            {/* ── SECTION: Acceptance rating ─────────────────────────────── */}
            <Section title="Interviewee Response">
              <StarRating
                label="Acceptance Rating"
                value={acceptanceRating}
                onChange={setAcceptanceRating}
                helpText="How willing was the interviewee to participate? (optional at booking)"
              />
            </Section>

            {/* ── SECTION: Notes ─────────────────────────────────────────── */}
            <Section title="Additional Notes">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Any additional context…" />
              </div>
            </Section>

          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── layout helpers ────────────────────────────────────────────────────────────

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
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
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
