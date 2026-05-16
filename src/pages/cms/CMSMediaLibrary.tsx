import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Trash2, Copy, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { optimizeImage } from '@/lib/imageOptimize';

const CMSMediaLibrary = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from('cms-media').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) { toast.error(error.message); }
    setFiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const getPublicUrl = (name: string) => {
    const { data } = supabase.storage.from('cms-media').getPublicUrl(name);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    setUploading(true);
    for (const original of Array.from(fileList)) {
      const file = await optimizeImage(original);
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('cms-media').upload(fileName, file, { contentType: file.type });
      if (error) toast.error(`Failed: ${file.name}`);
    }
    toast.success('Upload complete');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchFiles();
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this file?')) return;
    const { error } = await supabase.storage.from('cms-media').remove([name]);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    fetchFiles();
  };

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(getPublicUrl(name));
    toast.success('URL copied to clipboard');
  };

  return (
    <DashboardLayout title="Media Library">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/cms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold text-foreground">Media Library</h2>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Images
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No media files yet. Upload some images to get started.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <div key={file.name} className="relative group bg-card rounded-lg border overflow-hidden">
              <img src={getPublicUrl(file.name)} alt={file.name} className="w-full h-36 object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => handleCopy(file.name)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(file.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CMSMediaLibrary;
