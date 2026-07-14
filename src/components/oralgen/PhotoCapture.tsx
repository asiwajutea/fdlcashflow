import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
  /** Default facing mode. Defaults to 'environment' (back camera). */
  defaultCamera?: 'environment' | 'user';
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  label,
  required,
  value,
  onChange,
  defaultCamera = 'environment',
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(defaultCamera);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onChange(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const toggleCamera = () =>
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      {preview ? (
        <div className="relative w-full rounded-lg overflow-hidden border bg-muted">
          <img src={preview} alt={label} className="w-full h-36 object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-1.5 right-1.5 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Gallery / file pick */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Gallery
          </Button>

          {/* Camera capture */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
            {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
          </Button>

          {/* Flip camera toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Switch camera"
            onClick={toggleCamera}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {/* Camera capture: capture attribute forces camera, facingMode via accept hint isn't CSS-level
          so we use a data-key trick — remount when facingMode changes so the browser re-reads it */}
      <input
        key={facingMode}
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={facingMode}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};
