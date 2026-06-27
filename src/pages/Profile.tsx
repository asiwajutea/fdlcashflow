import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Save, User, FileText, Check, ExternalLink, Briefcase, CreditCard, Phone, Sparkles, Heart, Eye, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ImageCropper';

interface Lookup { id: string; name: string }

const Profile = () => {
  const { toast } = useToast();
  const { user, fullName, avatarUrl, role } = useAuth();
  const isCandidate = role === 'candidate';
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    birthday: '',
    gender: '',
    employee_id: '',
    employment_start_date: '',
    position_id: '',
    department_id: '',
    project_id: '',
    team_id: '',
    // Multi-select arrays
    position_ids: [] as string[],
    department_ids: [] as string[],
    project_ids: [] as string[],
    team_ids: [] as string[],
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  const [cvUrl, setCvUrl] = useState<string>('');
  const [idCardPath, setIdCardPath] = useState<string>('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idSignedUrl, setIdSignedUrl] = useState<string>('');

  const [positions, setPositions] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [projects, setProjects] = useState<Lookup[]>([]);
  const [teams, setTeams] = useState<Lookup[]>([]);

  const [linkedFromEmployee, setLinkedFromEmployee] = useState(false);

  // About Me
  const ABOUT_KEYS = [
    { key: 'background', label: 'Personal background', required: true, multiline: true },
    { key: 'education', label: 'Education', required: true, multiline: true },
    { key: 'family', label: 'Marriage / family', required: false, multiline: true },
    { key: 'hobbies', label: 'Hobbies & interests', required: false, multiline: true },
    { key: 'achievements', label: 'Achievements (optional)', required: false, multiline: true },
    { key: 'fun_fact', label: 'A fun fact about you (optional)', required: false, multiline: false },
  ] as const;
  const [aboutDetails, setAboutDetails] = useState<Record<string, string>>({});
  const [aboutVisibility, setAboutVisibility] = useState<Record<string, boolean>>({ about_me: true });
  const [aboutMe, setAboutMe] = useState('');
  const [aboutExcerpt, setAboutExcerpt] = useState('');
  const [generatingAbout, setGeneratingAbout] = useState(false);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const [profileRes, empRes, posRes, deptRes, projRes, teamRes] = await Promise.all([
        (supabase as any).from('profiles').select('*').eq('id', user.id).maybeSingle(),
        (supabase as any).from('employees').select('*').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('positions').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('departments').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('projects').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('teams').select('id, name').eq('is_active', true).order('display_order'),
      ]);
      const p = profileRes.data || {};
      const emp = empRes.data || {};
      // Prefill from employee record when profile fields are empty
      const bank_name = p.bank_name || emp.bank_name || '';
      const account_number = p.account_number || emp.account_number || '';
      const account_name = p.account_name || '';
      const employee_id = p.employee_id || emp.employee_id || '';
      if (!!emp.id && (!p.bank_name || !p.account_number)) setLinkedFromEmployee(true);

      setForm({
        full_name: p.full_name || emp.full_name || fullName || '',
        phone: p.phone || '',
        birthday: p.birthday || '',
        gender: p.gender || '',
        employee_id,
        employment_start_date: p.employment_start_date || '',
        position_id: p.position_id || '',
        department_id: p.department_id || '',
        project_id: p.project_id || '',
        team_id: p.team_id || '',
        position_ids: p.position_ids || (p.position_id ? [p.position_id] : []),
        department_ids: p.department_ids || (p.department_id ? [p.department_id] : []),
        project_ids: p.project_ids || (p.project_id ? [p.project_id] : []),
        team_ids: p.team_ids || (p.team_id ? [p.team_id] : []),
        bank_name,
        account_number,
        account_name,
      });
      setCvUrl(p.cv_url || '');
      setIdCardPath(p.id_card_url || '');
      if (p.id_card_url) {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(p.id_card_url, 3600);
        setIdSignedUrl(signed?.signedUrl || '');
      }
      setPositions(posRes.data || []);
      setDepartments(deptRes.data || []);
      setProjects(projRes.data || []);
      setTeams(teamRes.data || []);
      setAboutDetails((p.about_details && typeof p.about_details === 'object') ? p.about_details : {});
      setAboutVisibility((p.about_visibility && typeof p.about_visibility === 'object') ? p.about_visibility : { about_me: true });
      setAboutMe(p.about_me || '');
      setAboutExcerpt(p.about_me_excerpt || '');
    })();
  }, [user, fullName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    setRawImageSrc(URL.createObjectURL(f));
    setCropperOpen(true);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setCropperOpen(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        birthday: form.birthday || null,
        gender: form.gender || null,
        employee_id: form.employee_id || null,
        employment_start_date: form.employment_start_date || null,
        position_id: form.position_ids[0] || form.position_id || null,
        department_id: form.department_ids[0] || form.department_id || null,
        project_id: form.project_ids[0] || form.project_id || null,
        team_id: form.team_ids[0] || form.team_id || null,
        position_ids: form.position_ids,
        department_ids: form.department_ids,
        project_ids: form.project_ids,
        team_ids: form.team_ids,
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        account_name: form.account_name || null,
        about_me: aboutMe || null,
        about_me_excerpt: aboutExcerpt || null,
        about_details: aboutDetails,
        about_visibility: aboutVisibility,
      };

      if (croppedBlob) {
        const filePath = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        updates.avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      if (cvFile) {
        const ext = cvFile.name.split('.').pop() || 'pdf';
        const path = `${user.id}/cv.${ext}`;
        const { error: cvErr } = await supabase.storage.from('resumes').upload(path, cvFile, { upsert: true });
        if (cvErr) throw cvErr;
        const { data: cvUrlData } = supabase.storage.from('resumes').getPublicUrl(path);
        updates.cv_url = cvUrlData.publicUrl;
      }
      if (idFile) {
        const ext = idFile.name.split('.').pop() || 'pdf';
        const path = `${user.id}/id-card.${ext}`;
        const { error: idErr } = await supabase.storage.from('documents').upload(path, idFile, { upsert: true });
        if (idErr) throw idErr;
        updates.id_card_url = path;
      }

      const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      // Sync bank details + name to linked employee record (if exists)
      try {
        await (supabase as any).from('employees').update({
          full_name: form.full_name.trim(),
          bank_name: form.bank_name || null,
          account_number: form.account_number || null,
        }).eq('user_id', user.id);
      } catch (e) {
        console.warn('Employee sync skipped:', e);
      }

      toast({ title: 'Profile updated!' });
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || avatarUrl || undefined;
  const setF = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  const generateAbout = async () => {
    const missing = ABOUT_KEYS.filter(k => k.required && !(aboutDetails[k.key] || '').trim());
    if (missing.length) {
      toast({ title: 'A few details first', description: `Please fill: ${missing.map(m => m.label).join(', ')}`, variant: 'destructive' });
      return;
    }
    setGeneratingAbout(true);
    try {
      const positionName = positions.find(p => p.id === form.position_id)?.name || '';
      const departmentName = departments.find(d => d.id === form.department_id)?.name || '';
      const { data, error } = await supabase.functions.invoke('ai-generate-about-me', {
        body: { full_name: form.full_name, position: positionName, department: departmentName, details: aboutDetails },
      });
      if (error) throw error;
      setAboutMe((data as any)?.about_me || '');
      setAboutExcerpt((data as any)?.excerpt || '');
      toast({ title: 'About Me drafted', description: 'Review & edit, then Save Changes.' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setGeneratingAbout(false);
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Identity</CardTitle>
            <CardDescription>Your name, photo, and basic identification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback className="bg-muted text-3xl">
                    {form.full_name ? form.full_name.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setF({ full_name: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setF({ birthday: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setF({ gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setF({ phone: e.target.value })} placeholder="+234..." />
            </div>
          </CardContent>
        </Card>

        {/* Employment — hidden for candidates */}
        {!isCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Employment</CardTitle>
            <CardDescription>Your role within the company.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={form.employee_id} onChange={(e) => setF({ employee_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Employment Start Date</Label>
                <Input type="date" value={form.employment_start_date} onChange={(e) => setF({ employment_start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Designation(s)</Label>
                <MultiSelect
                  options={positions.map(p => ({ value: p.id, label: p.name }))}
                  value={form.position_ids}
                  onChange={v => setF({ position_ids: v })}
                  placeholder="Select designation(s)"
                />
              </div>
              <div className="space-y-2">
                <Label>Department(s)</Label>
                <MultiSelect
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  value={form.department_ids}
                  onChange={v => setF({ department_ids: v })}
                  placeholder="Select department(s)"
                />
              </div>
              <div className="space-y-2">
                <Label>Project(s)</Label>
                <MultiSelect
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  value={form.project_ids}
                  onChange={v => setF({ project_ids: v })}
                  placeholder="Select project(s)"
                />
              </div>
              <div className="space-y-2">
                <Label>Team(s)</Label>
                <MultiSelect
                  options={teams.map(t => ({ value: t.id, label: t.name }))}
                  value={form.team_ids}
                  onChange={v => setF({ team_ids: v })}
                  placeholder="Select team(s)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        )} {/* end !isCandidate — Employment */}

        {/* Bank — hidden for candidates */}
        {!isCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Bank Details</CardTitle>
            <CardDescription>Used for payslip payments. Kept in sync with your employee record.</CardDescription>
          </CardHeader>
          <CardContent>
            {linkedFromEmployee && (
              <p className="text-xs text-muted-foreground mb-3 italic">✓ Prefilled from your linked employee record</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={(e) => setF({ bank_name: e.target.value })} placeholder="e.g. First Bank" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={form.account_number} onChange={(e) => setF({ account_number: e.target.value })} placeholder="0123456789" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Account Name</Label>
                <Input value={form.account_name} onChange={(e) => setF({ account_name: e.target.value })} placeholder="As it appears on your bank account" />
              </div>
            </div>
          </CardContent>
        </Card>
        )} {/* end !isCandidate — Bank Details */}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Documents</CardTitle>
            <CardDescription>Optional. Upload or replace your CV and ID card.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-4 space-y-2">
                <Label className="text-sm">CV / Resume</Label>
                {cvUrl && !cvFile && (
                  <a href={cvUrl} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> View current CV
                  </a>
                )}
                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                {cvFile && <p className="text-xs text-primary flex items-center gap-1"><Check className="h-3 w-3" /> {cvFile.name}</p>}
              </div>
              <div className="border-2 border-dashed border-muted rounded-lg p-4 space-y-2">
                <Label className="text-sm">ID Card</Label>
                {idSignedUrl && !idFile && (
                  <a href={idSignedUrl} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> View current ID
                  </a>
                )}
                <Input type="file" accept=".pdf,image/*" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                {idFile && <p className="text-xs text-primary flex items-center gap-1"><Check className="h-3 w-3" /> {idFile.name}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Me — hidden for candidates */}
        {!isCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> About Me</CardTitle>
            <CardDescription>
              Tell us about yourself. We'll use the details below to draft your About Me with AI. You can edit anything before saving.
              Use the toggles to mark each item as public or private.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ABOUT_KEYS.map(({ key, label, required, multiline }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm">
                    {label} {required && <span className="text-destructive">*</span>}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAboutVisibility(v => ({ ...v, [key]: !v[key] }))}
                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {aboutVisibility[key] ? <><Eye className="h-3 w-3" /> Public</> : <><EyeOff className="h-3 w-3" /> Private</>}
                  </button>
                </div>
                {multiline ? (
                  <Textarea
                    rows={3}
                    value={aboutDetails[key] || ''}
                    onChange={(e) => setAboutDetails(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={required ? 'Required' : 'Optional'}
                  />
                ) : (
                  <Input
                    value={aboutDetails[key] || ''}
                    onChange={(e) => setAboutDetails(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={required ? 'Required' : 'Optional'}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">AI uses the details above to draft a warm About Me.</p>
              <Button type="button" variant="outline" size="sm" onClick={generateAbout} disabled={generatingAbout}>
                <Sparkles className="h-4 w-4 mr-1" /> {generatingAbout ? 'Generating…' : 'Generate About Me'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Short intro (excerpt)</Label>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Always public</span>
              </div>
              <Input
                value={aboutExcerpt}
                onChange={(e) => setAboutExcerpt(e.target.value)}
                maxLength={200}
                placeholder="One warm sentence about you…"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">About Me</Label>
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={!!aboutVisibility.about_me} onCheckedChange={(v) => setAboutVisibility(av => ({ ...av, about_me: v }))} />
                  <span className="text-muted-foreground">{aboutVisibility.about_me ? 'Public' : 'Private'}</span>
                </div>
              </div>
              <Textarea
                rows={8}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Your full About Me writeup will appear here. Generate with AI or write your own."
              />
            </div>
          </CardContent>
        </Card>
        )} {/* end !isCandidate — About Me */}

        <div className="sticky bottom-4 z-10">
          <Button className="w-full gap-2 shadow-lg" size="lg" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {rawImageSrc && (
        <ImageCropper
          open={cropperOpen}
          imageSrc={rawImageSrc}
          onClose={() => setCropperOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </DashboardLayout>
  );
};

export default Profile;
