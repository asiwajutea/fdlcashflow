import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Save, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ImageCropper';

const Profile = () => {
  const { toast } = useToast();
  const { user, fullName, avatarUrl } = useAuth();
  const [name, setName] = useState(fullName || '');
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fullName) setName(fullName);
  }, [fullName]);

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
      const updates: Record<string, any> = { full_name: name.trim() };

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
      // Reload to refresh auth state with new avatar/name
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
      <div className="max-w-lg mx-auto">
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
                    {name ? name.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>

            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
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
