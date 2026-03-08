
-- Create cms-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-media', 'cms-media', true);

-- Allow public read access
CREATE POLICY "Public can view cms media" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload cms media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cms-media');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete cms media" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'cms-media');
