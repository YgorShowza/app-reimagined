-- SEGEMPAT · amplia auditoria automática para módulos de treinamento e cronograma

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'exam_attempts',
    'cronograma_recurring_models',
    'cronograma_suspensions',
    'question_bank',
    'training_modules',
    'training_schedules'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
        t,
        t
      );
    END IF;
  END LOOP;
END $$;
