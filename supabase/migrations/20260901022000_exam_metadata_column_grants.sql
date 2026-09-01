-- Permite leituras auxiliares de metadados da prova sem reexpor o JSON de questões/gabarito.
REVOKE SELECT ON TABLE public.exams FROM authenticated;

GRANT SELECT (
  id,
  title,
  description,
  exam_type,
  target_sector,
  min_approval_pct,
  scheduled_date,
  status,
  created_by,
  created_at,
  updated_at
) ON public.exams TO authenticated;

-- A coluna questions permanece sem SELECT direto para authenticated.
-- Inspetores leem a prova completa via list_exams_admin/get_exam_admin;
-- Operadores usam list_available_exams/get_exam_for_attempt.
