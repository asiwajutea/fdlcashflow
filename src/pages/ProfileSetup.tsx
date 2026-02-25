import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Upload, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fullName, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      toast({ title: 'Profile picture uploaded!' });
      // Force page reload to update auth state
      window.location.href = '/';
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Upload Profile Picture</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            A profile picture is required to continue. This will be your avatar across the platform.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={previewUrl || undefined} />
                <AvatarFallback className="bg-muted text-3xl">
                  {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
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

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file && (
            <Button variant="outline" className="w-full gap-2" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose Photo
            </Button>
          )}

          {file && (
            <Button className="w-full" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Save & Continue'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
