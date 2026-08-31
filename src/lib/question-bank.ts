import { supabase } from "@/integrations/supabase/client";

export interface QuestionBankItem {
  id: string;
  bank_type: string;
  question_text: string;
  options: string[];
  correct_index: number | null;
  correct_answer: string | null;
  explanation: string | null;
  target_sector: string;
  difficulty: string;
  theme: string;
  active: boolean;
  created_at: string;
}

export interface QuestionBankInput {
  bank_type: string;
  question_text: string;
  options: string[];
  correct_index: number | null;
  correct_answer: string | null;
  explanation: string | null;
  target_sector: string;
  difficulty: string;
  theme: string;
  active: boolean;
}

function normalize(row: any): QuestionBankItem {
  return {
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  } as QuestionBankItem;
}

export async function listQuestionBank(): Promise<QuestionBankItem[]> {
  const { data, error } = await (supabase as any)
    .from("question_bank")
    .select("*")
    .order("active", { ascending: false })
    .order("theme", { ascending: true })
    .order("question_text", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function listActiveQuestionBank(): Promise<QuestionBankItem[]> {
  const { data, error } = await (supabase as any)
    .from("question_bank")
    .select("*")
    .eq("active", true)
    .order("theme", { ascending: true })
    .order("question_text", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function createQuestionBankItem(input: QuestionBankInput) {
  const { error } = await (supabase as any).from("question_bank").insert({
    ...input,
    options: input.options,
  });
  if (error) throw error;
}

export async function updateQuestionBankItem(id: string, input: Partial<QuestionBankInput>) {
  const { error } = await (supabase as any)
    .from("question_bank")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestionBankItem(id: string) {
  const { error } = await (supabase as any)
    .from("question_bank")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function questionThemeLabel(item: QuestionBankItem) {
  return item.theme?.trim() || item.bank_type?.trim() || "Questão sem tema";
}
