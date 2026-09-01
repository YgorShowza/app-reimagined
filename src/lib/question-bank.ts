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

export interface OperationalQuestionBankItem {
  id: string;
  bank_type: string;
  question_text: string;
  options: string[];
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

function normalizeOperational(row: any): OperationalQuestionBankItem {
  return {
    id: String(row.id),
    bank_type: String(row.bank_type || ""),
    question_text: String(row.question_text || ""),
    options: Array.isArray(row.options) ? row.options : [],
    target_sector: String(row.target_sector || "Todos"),
    difficulty: String(row.difficulty || "Básico"),
    theme: String(row.theme || ""),
    active: Boolean(row.active),
    created_at: String(row.created_at || ""),
  };
}

export async function listQuestionBank(): Promise<QuestionBankItem[]> {
  const { data, error } = await (supabase as any).rpc("list_question_bank_admin");
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function listActiveQuestionBank(): Promise<OperationalQuestionBankItem[]> {
  const { data, error } = await (supabase as any).rpc("list_operational_questions");
  if (error) throw error;
  return (data ?? []).map(normalizeOperational);
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

export function questionThemeLabel(item: Pick<QuestionBankItem, "theme" | "bank_type"> | Pick<OperationalQuestionBankItem, "theme" | "bank_type">) {
  return item.theme?.trim() || item.bank_type?.trim() || "Questão sem tema";
}
