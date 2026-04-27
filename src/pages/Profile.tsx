import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Save, User, FileText, Upload, Check, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ImageCropper';

interface Lookup { id: string; name: string }

const Profile = () => {
  const { toast } = useToast();
  const { user, fullName, avatarUrl } = useAuth();
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Profile fields
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
  });

  const [cvUrl, setCvUrl] = useState<string>('');
  const [idCardPath, setIdCardPath] = useState<string>('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idSignedUrl, setIdSignedUrl] = useState<string>('');

  // Lookup data
  const [positions, setPositions] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [projects, setProjects] = useState<Lookup[]>([]);
  const [teams, setTeams] = useState<Lookup[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, posRes, deptRes, projRes, teamRes] = await Promise.all([
        (supabase as any).from('profiles').select('*').eq('id', user.id).maybeSingle(),
        (supabase as any).from('positions').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('departments').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('projects').select('id, name').eq('is_active', true).order('display_order'),
        (supabase as any).from('teams').select('id, name').eq('is_active', true).order('display_order'),
      ]);
      const p = profileRes.data || {};
      setForm({
        full_name: p.full_name || fullName || '',
        phone: p.phone || '',
        birthday: p.birthday || '',
        gender: p.gender || '',
        employee_id: p.employee_id || '',
        employment_start_date: p.employment_start_date || '',
        position_id: p.position_id || '',
        department_id: p.department_id || '',
        project_id: p.project_id || '',
        team_id: p.team_id || '',
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
        position_id: form.position_id || null,
        department_id: form.department_id || null,
        project_id: form.project_id || null,
        team_id: form.team_id || null,
      };

      if (croppedBlob) {
        const filePath = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        updates.avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await (supabase as any).from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      toast({ title: 'Profile updated!' });
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || avatarUrl || undefined;

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input id="birthday" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_start_date">Employment Start Date</Label>
                <Input id="employment_start_date" type="date" value={form.employment_start_date} onChange={(e) => setForm({ ...form, employment_start_date: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={form.position_id} onValueChange={(v) => setForm({ ...form, position_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
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
