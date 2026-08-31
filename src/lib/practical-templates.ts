import { supabase } from "@/integrations/supabase/client";

export type PracticalRecurrence = "once" | "monthly" | "bimonthly" | "quarterly";
export type PracticalTemplateStatus = "Ativo" | "Inativo";

export interface PracticalEvalTemplate {
  id: string;
  title: string;
  platform: string | null;
  description: string | null;
  target_sector: "Todos" | "CFTV" | "Vigilância";
  min_approval_score: number;
  recurrence: PracticalRecurrence;
  applications_per_month: number;
  tasks: unknown[];
  status: PracticalTemplateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PracticalEvalTemplateInput = Omit<PracticalEvalTemplate, "id" | "created_by" | "created_at" | "updated_at">;

export async function listPracticalEvalTemplates(): Promise<PracticalEvalTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("practical_eval_templates")
    .select("*")
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    min_approval_score: Number(row.min_approval_score ?? 7),
    applications_per_month: Number(row.applications_per_month ?? 1),
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
  })) as PracticalEvalTemplate[];
}

export async function createPracticalEvalTemplate(input: PracticalEvalTemplateInput) {
  const { data, error } = await (supabase as any)
    .from("practical_eval_templates")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as PracticalEvalTemplate;
}

export async function updatePracticalEvalTemplate(id: string, patch: Partial<PracticalEvalTemplateInput>) {
  const { data, error } = await (supabase as any)
    .from("practical_eval_templates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PracticalEvalTemplate;
}

export async function deletePracticalEvalTemplate(id: string) {
  const { error } = await (supabase as any).from("practical_eval_templates").delete().eq("id", id);
  if (error) throw error;
}

export function practicalDueMonths(recurrence: PracticalRecurrence) {
  if (recurrence === "monthly") return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  if (recurrence === "bimonthly") return [0, 2, 4, 6, 8, 10];
  if (recurrence === "quarterly") return [0, 3, 6, 9];
  return [] as number[];
}
