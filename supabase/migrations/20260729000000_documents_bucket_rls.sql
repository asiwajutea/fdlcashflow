-- ─── documents storage bucket: ensure it exists + RLS policies ───────────────
--
-- The contract templates feature uploads PDFs to the 'documents' bucket.
-- Without storage RLS policies, Supabase rejects all uploads with:
--   "new row violates row level security policy"
--
-- The bucket is PUBLIC so that publicUrl() in ContractTemplates.tsx can
-- generate direct https://…/storage/v1/object/public/documents/… links
-- without needing signed URLs.
--
-- Policies granted:
--   INSERT  → admin users only (contract template PDFs are admin-managed)
--   UPDATE  → admin users only (replace / upsert)
--   DELETE  → admin users only
--   SELECT  → all authenticated users (candidates can view/download contracts)

-- 1. Create the bucket if it doesn't already exist (idempotent).
--    public = true so that publicUrl() links work without signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,                           -- public bucket so /object/public/… URLs work
  20971520,                       -- 20 MB max per file
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop old policies if they exist so this migration is re-runnable
DROP POLICY IF EXISTS "Admins can upload documents"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents"             ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents"  ON storage.objects;
DROP POLICY IF EXISTS "Public can read documents"               ON storage.objects;

-- 3. INSERT — admins only
CREATE POLICY "Admins can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(auth.uid(), 'admin')
  );

-- 4. UPDATE — admins only (needed for upsert: true)
CREATE POLICY "Admins can update documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(auth.uid(), 'admin')
  );

-- 5. DELETE — admins only
CREATE POLICY "Admins can delete documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6. SELECT — all users including anonymous (needed for public bucket URL access)
CREATE POLICY "Public can read documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');
