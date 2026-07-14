import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Images, X, RefreshCw } from 'lucide-react';

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
  /** Which camera to open first. 'environment' = back (default), 'user' = front. */
  defaultCamera?: 'environment' | 'user';
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  label,
  required,
  value,
  onChange,
  defaultCamera = 'environment',
}) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  const [preview,     setPreview]     = useState<string | null>(null);
  const [lightbox,    setLightbox]    = useState(false);
  const [facingMode,  setFacingMode]  = useState<'environment' | 'user'>(defaultCamera);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onChange(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current)  cameraRef.current.value  = '';
  };

  const flipCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  };

  return (
    <>
      {/* Card */}
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        <span className="text-sm font-medium leading-none flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </span>

        {preview ? (
          /* ── Preview state ── */
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLightbox(true)}
            onKeyDown={(e) => e.key === 'Enter' && setLightbox(true)}
            className="relative rounded-xl overflow-hidden border-2 border-primary/30 cursor-pointer group"
            style={{ aspectRatio: '4/3' }}
            title={`View ${label}`}
          >
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full transition-opacity">
                Tap to view
              </span>
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={clear}
              className="absolute top-1.5 right-1.5 rounded-full bg-black/60 text-white p-1 hover:bg-destructive transition-colors z-10"
              title="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* ── Empty state — camera is primary action ── */
          <div
            className="relative rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            style={{ aspectRatio: '4/3' }}
            onClick={() => cameraRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && cameraRef.current?.click()}
            title={`Take ${label}`}
          >
            {/* Flip camera — top-right */}
            <button
              type="button"
              onClick={flipCamera}
              className="absolute top-2 right-2 rounded-full bg-muted text-muted-foreground p-1.5 hover:bg-accent transition-colors z-10"
              title={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Gallery picker — top-left */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); galleryRef.current?.click(); }}
              className="absolute top-2 left-2 rounded-full bg-muted text-muted-foreground p-1.5 hover:bg-accent transition-colors z-10"
              title="Choose from gallery"
            >
              <Images className="h-3.5 w-3.5" />
            </button>

            {/* Primary camera icon */}
            <Camera className="h-8 w-8 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground text-center px-2">
              {facingMode === 'environment' ? 'Back camera' : 'Front camera'}
            </span>
          </div>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {/* key={facingMode} forces remount so browser re-reads the capture attribute */}
      <input
        key={facingMode}
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={facingMode}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Lightbox */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              {label}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={preview}
              alt={label}
              className="w-full object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
