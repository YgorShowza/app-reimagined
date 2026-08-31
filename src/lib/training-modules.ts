import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await (supabase as any)
    .from("training_modules")
    .select("*")
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TrainingModule[];
}

export async function createTrainingModule(input: TrainingModuleInput) {
  const { error } = await (supabase as any).from("training_modules").insert(input);
  if (error) throw error;
}

export async function updateTrainingModule(id: string, input: Partial<TrainingModuleInput>) {
  const { error } = await (supabase as any).from("training_modules").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTrainingModule(id: string) {
  const { error } = await (supabase as any).from("training_modules").delete().eq("id", id);
  if (error) throw error;
}
