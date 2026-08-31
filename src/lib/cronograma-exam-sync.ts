import { supabase } from "@/integrations/supabase/client";

export async function syncCronogramaForExamAttempt(input: {
  examId: string;
  matricula: string | null;
  finishedAt?: string | null;
}) {
  if (!input.matricula) return 0;

  const completionDate = (input.finishedAt || new Date().toISOString()).slice(0, 10);
  const { data, error } = await (supabase as any)
    .from("cronograma_entries")
    .update({
      status: "Realizado",
      type: "Realizado",
      completion_date: completionDate,
      justification: null,
    })
    .eq("exam_id", input.examId)
    .eq("employee_matricula", input.matricula)
    .neq("status", "Realizado")
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
