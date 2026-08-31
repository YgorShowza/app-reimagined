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

export async function listActiveQuestionBank(): Promise<QuestionBankItem[]> {
  const { data, error } = await (supabase as any)
    .from("question_bank")
    .select("*")
    .eq("active", true)
    .order("theme", { ascending: true })
    .order("question_text", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  })) as QuestionBankItem[];
}

export function questionThemeLabel(item: QuestionBankItem) {
  return item.theme?.trim() || item.bank_type?.trim() || "Questão sem tema";
}
