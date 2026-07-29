-- Re-apply documents bucket settings in case the previous migration was skipped.
-- Safe to run multiple times (all operations are idempotent).

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  20971520,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop and recreate all storage policies for the documents bucket
DROP POLICY IF EXISTS "Admins can upload documents"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents"             ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents"  ON storage.objects;
DROP POLICY IF EXISTS "Public can read documents"               ON storage.objects;

CREATE POLICY "Admins can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING     (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read documents"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'documents');
