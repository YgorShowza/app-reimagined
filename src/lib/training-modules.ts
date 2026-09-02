import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content: string | null;
  display_order: number;
  min_score: number;
  target_sector: string;
  status: "Ativo" | "Inativo";
  created_at: string;
  updated_at: string;
}

export interface TrainingModuleInput {
  title: string;
  description: string;
  content: string | null;
  display_order: number;
  min_score: number;
  target_sector: string;
  status: "Ativo" | "Inativo";
}

export async function listTrainingModules(): Promise<TrainingModule[]> {
  if (isSegempatApiConfigured()) return apiRequest<TrainingModule[]>("/api/training/modules");
  const { data, error } = await (supabase as any).from("training_modules").select("*").order("display_order", { ascending: true }).order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TrainingModule[];
}

export async function createTrainingModule(input: TrainingModuleInput) {
  if (isSegempatApiConfigured()) {
    await apiRequest<{ id: string }>("/api/admin/training/modules", { method: "POST", body: JSON.stringify(input) });
    return;
  }
  const { error } = await (supabase as any).from("training_modules").insert(input);
  if (error) throw error;
}

export async function updateTrainingModule(id: string, input: Partial<TrainingModuleInput>) {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/admin/training/modules/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
    return;
  }
  const { error } = await (supabase as any).from("training_modules").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingModule(id: string) {
  if (isSegempatApiConfigured()) {
    await apiRequest<void>(`/api/admin/training/modules/${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const { error } = await (supabase as any).from("training_modules").delete().eq("id", id);
  if (error) throw error;
}
