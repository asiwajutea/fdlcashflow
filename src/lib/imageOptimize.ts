import imageCompression from 'browser-image-compression';

export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Skip GIF and SVG (animation / vector)
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.82,
    });
    // Rename to .webp
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([compressed], `${base}.webp`, { type: 'image/webp' });
  } catch (e) {
    console.warn('Image optimization failed, uploading original', e);
    return file;
  }
}
