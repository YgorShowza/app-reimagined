-- SEGEMPAT · princípio do menor privilégio para Operador

DROP POLICY IF EXISTS "Authenticated can view employees" ON public.employees;
CREATE POLICY "Employees select by profile"
  ON public.employees FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_current_employee(id)
  );

DROP POLICY IF EXISTS "Authenticated can view exams" ON public.exams;
CREATE POLICY "Exams select by publication"
  ON public.exams FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR status = 'Publicada'
  );
