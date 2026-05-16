import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (url: string) => void;
  bucket?: string;
}

const MediaPicker = ({ open, onOpenChange, onPick, bucket = 'cms-media' }: MediaPickerProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.storage.from(bucket).list('', {
        limit: 500,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      setFiles(data || []);
      setLoading(false);
    })();
  }, [open, bucket]);

  const getUrl = (name: string) =>
    supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pick from Media Library</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No media found.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => {
                    onPick(getUrl(f.name));
                    onOpenChange(false);
                  }}
                  className="group relative aspect-square bg-muted rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition"
                >
                  <img
                    src={getUrl(f.name)}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-background/90 text-foreground text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition">
                    {f.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPicker;
