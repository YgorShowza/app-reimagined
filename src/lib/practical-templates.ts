import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export type PracticalRecurrence = "once" | "monthly" | "bimonthly" | "quarterly";
export type PracticalTemplateStatus = "Ativo" | "Inativo";
export type PracticalTargetSector = "Todos" | "CFTV" | "Vigilância" | "Portaria" | "Ronda" | "Administrativo" | "Operações";

export interface PracticalEvalTemplate {
  id: string;
  title: string;
  platform: string | null;
  description: string | null;
  target_sector: PracticalTargetSector;
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

function normalize(row: any): PracticalEvalTemplate {
  return { ...row, min_approval_score: Number(row.min_approval_score ?? 7), applications_per_month: Number(row.applications_per_month ?? 1), tasks: Array.isArray(row.tasks) ? row.tasks : [] } as PracticalEvalTemplate;
}

export async function listPracticalEvalTemplates(): Promise<PracticalEvalTemplate[]> {
  if (isSegempatApiConfigured()) return (await apiRequest<PracticalEvalTemplate[]>("/api/operations/practical-templates")).map(normalize);
  const { data, error } = await (supabase as any).from("practical_eval_templates").select("*").order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function createPracticalEvalTemplate(input: PracticalEvalTemplateInput) {
  if (isSegempatApiConfigured()) return normalize(await apiRequest<PracticalEvalTemplate>("/api/operations/practical-templates", { method:"POST", body:JSON.stringify(input) }));
  const { data, error } = await (supabase as any).from("practical_eval_templates").insert(input).select("*").single();
  if (error) throw error;
  return normalize(data);
}

export async function updatePracticalEvalTemplate(id: string, patch: Partial<PracticalEvalTemplateInput>) {
  if (isSegempatApiConfigured()) return normalize(await apiRequest<PracticalEvalTemplate>(`/api/operations/practical-templates/${encodeURIComponent(id)}`, { method:"PATCH", body:JSON.stringify(patch) }));
  const { data, error } = await (supabase as any).from("practical_eval_templates").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return normalize(data);
}

export async function deletePracticalEvalTemplate(id: string) {
  if (isSegempatApiConfigured()) { await apiRequest(`/api/operations/practical-templates/${encodeURIComponent(id)}`, { method:"DELETE" }); return; }
  const { error } = await (supabase as any).from("practical_eval_templates").delete().eq("id", id);
  if (error) throw error;
}

export function practicalDueMonths(recurrence: PracticalRecurrence) {
  if (recurrence === "monthly") return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  if (recurrence === "bimonthly") return [0, 2, 4, 6, 8, 10];
  if (recurrence === "quarterly") return [0, 3, 6, 9];
  return [] as number[];
}
