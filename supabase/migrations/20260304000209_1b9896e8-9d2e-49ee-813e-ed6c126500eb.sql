INSERT INTO storage.buckets (id, name, public) VALUES ('screening-audio', 'screening-audio', true);

CREATE POLICY "Authenticated upload screening audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'screening-audio');
CREATE POLICY "Public read screening audio" ON storage.objects FOR SELECT USING (bucket_id = 'screening-audio');