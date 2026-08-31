-- SEGEMPAT · registro e validação pública de certificados

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matricula text,
  employee_name text NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
  exam_title text NOT NULL,
  score numeric NOT NULL,
  verification_code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certificates_user_idx ON public.certificates(user_id, issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_upper_idx ON public.certificates(upper(verification_code));

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

DROP POLICY IF EXISTS "Users read own certificates" ON public.certificates;
CREATE POLICY "Users read own certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.issue_certificate_from_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_title text;
  v_employee_name text;
  v_code text;
BEGIN
  IF NEW.passed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_exam_title FROM public.exams WHERE id = NEW.exam_id;
  SELECT nome INTO v_employee_name FROM public.profiles WHERE id = NEW.user_id;

  v_code := 'SEG-' || upper(substr(md5(NEW.id::text), 1, 12));

  INSERT INTO public.certificates(
    attempt_id, user_id, matricula, employee_name, exam_id, exam_title,
    score, verification_code, issued_at
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.matricula,
    COALESCE(v_employee_name, NEW.matricula, 'Colaborador'),
    NEW.exam_id,
    COALESCE(v_exam_title, 'Avaliação SEGEMPAT'),
    NEW.score,
    v_code,
    COALESCE(NEW.finished_at, NEW.created_at, now())
  )
  ON CONFLICT (attempt_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS issue_certificate_after_attempt ON public.exam_attempts;
CREATE TRIGGER issue_certificate_after_attempt
  AFTER INSERT OR UPDATE OF passed ON public.exam_attempts
  FOR EACH ROW
  WHEN (NEW.passed IS TRUE)
  EXECUTE FUNCTION public.issue_certificate_from_attempt();

-- Emite certificados para aprovações anteriores à migration.
INSERT INTO public.certificates(
  attempt_id, user_id, matricula, employee_name, exam_id, exam_title,
  score, verification_code, issued_at
)
SELECT
  a.id,
  a.user_id,
  a.matricula,
  COALESCE(p.nome, a.matricula, 'Colaborador'),
  a.exam_id,
  COALESCE(e.title, 'Avaliação SEGEMPAT'),
  a.score,
  'SEG-' || upper(substr(md5(a.id::text), 1, 12)),
  COALESCE(a.finished_at, a.created_at, now())
FROM public.exam_attempts a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.exams e ON e.id = a.exam_id
WHERE a.passed IS TRUE
ON CONFLICT (attempt_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_certificate(p_code text)
RETURNS TABLE (
  is_valid boolean,
  employee_name text,
  exam_title text,
  score numeric,
  issued_at timestamptz,
  verification_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT c.revoked AS is_valid,
    c.employee_name,
    c.exam_title,
    c.score,
    c.issued_at,
    c.verification_code
  FROM public.certificates c
  WHERE upper(c.verification_code) = upper(trim(p_code))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.validate_certificate(text) TO anon, authenticated;

-- Auditoria dos certificados permanece disponível ao Inspetor.
DROP TRIGGER IF EXISTS audit_certificates ON public.certificates;
CREATE TRIGGER audit_certificates
  AFTER INSERT OR UPDATE OR DELETE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
