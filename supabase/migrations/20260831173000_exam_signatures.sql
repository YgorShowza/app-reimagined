-- SEGEMPAT · Assinatura eletrônica de provas formais

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_agreed boolean NOT NULL DEFAULT false;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exam-signatures', 'exam-signatures', false, 524288, ARRAY['image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own exam signatures" ON storage.objects;
CREATE POLICY "Users upload own exam signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exam-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own exam signatures" ON storage.objects;
CREATE POLICY "Users read own exam signatures"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exam-signatures'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Users update own exam signatures" ON storage.objects;
CREATE POLICY "Users update own exam signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'exam-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'exam-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own exam signatures" ON storage.objects;
CREATE POLICY "Users delete own exam signatures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exam-signatures'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- O próprio usuário pode finalizar a assinatura apenas na própria tentativa.
DROP POLICY IF EXISTS "Users sign own exam attempts" ON public.exam_attempts;
CREATE POLICY "Users sign own exam attempts"
ON public.exam_attempts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
