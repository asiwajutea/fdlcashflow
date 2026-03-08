import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

const ImageUpload = ({ value, onChange, label = 'Image', bucket = 'cms-media' }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
      toast.error('Upload failed: ' + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    onChange(urlData.publicUrl);
    toast.success('Image uploaded');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload below"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange('')}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      {value && (
        <img src={value} alt="Preview" className="mt-1 h-32 w-full object-cover rounded-md border" />
      )}
    </div>
  );
};

export default ImageUpload;
