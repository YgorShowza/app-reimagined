-- SEGEMPAT · núcleo de questões e treinamentos

CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_type text NOT NULL CHECK (bank_type IN ('procedimentos_internos','treinamento_dinamico','simulacoes')),
  question_text text NOT NULL CHECK (length(trim(question_text)) > 0),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer,
  correct_answer text,
  explanation text,
  target_sector text NOT NULL DEFAULT 'Todos',
  difficulty text NOT NULL DEFAULT 'Básico' CHECK (difficulty IN ('Básico','Intermediário','Avançado')),
  theme text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_bank_type_idx ON public.question_bank(bank_type, active);
CREATE INDEX IF NOT EXISTS question_bank_sector_idx ON public.question_bank(target_sector, active);

CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text NOT NULL,
  content text,
  display_order integer NOT NULL DEFAULT 1,
  min_score numeric NOT NULL DEFAULT 7,
  target_sector text NOT NULL DEFAULT 'Todos',
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Inativo')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_modules_order_idx ON public.training_modules(status, display_order);

CREATE TABLE IF NOT EXISTS public.training_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_matricula text,
  cycle_days integer NOT NULL DEFAULT 90 CHECK (cycle_days > 0),
  last_training_date date,
  window_start date,
  window_end date,
  observations text,
  status text NOT NULL DEFAULT 'Em dia' CHECK (status IN ('Em dia','Próximo ao vencimento','Vencido')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);
CREATE INDEX IF NOT EXISTS training_schedules_status_idx ON public.training_schedules(status, window_end);

DROP TRIGGER IF EXISTS question_bank_set_updated_at ON public.question_bank;
CREATE TRIGGER question_bank_set_updated_at BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS training_modules_set_updated_at ON public.training_modules;
CREATE TRIGGER training_modules_set_updated_at BEFORE UPDATE ON public.training_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS training_schedules_set_updated_at ON public.training_schedules;
CREATE TRIGGER training_schedules_set_updated_at BEFORE UPDATE ON public.training_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_schedules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank, public.training_modules, public.training_schedules TO authenticated;
GRANT ALL ON public.question_bank, public.training_modules, public.training_schedules TO service_role;

CREATE POLICY "Question bank select" ON public.question_bank FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR active = true);
CREATE POLICY "Admins manage question bank" ON public.question_bank FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Training modules select" ON public.training_modules FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR status = 'Ativo');
CREATE POLICY "Admins manage training modules" ON public.training_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Training schedules select" ON public.training_schedules FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.is_current_employee(employee_id));
CREATE POLICY "Admins manage training schedules" ON public.training_schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['question_bank','training_modules','training_schedules'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END $$;
