import { supabase } from "@/integrations/supabase/client";

export interface CronogramaYearMonthSummary {
  month: string;
  total: number;
  realizado: number;
  pendente: number;
  justificado: number;
  executionRate: number;
}

type StatusRow = {
  month: string;
  status: "Pendente" | "Realizado" | "Justificado";
};

export async function listCronogramaYearSummary(year: number): Promise<CronogramaYearMonthSummary[]> {
  const start = `${year}-01`;
  const end = `${year}-12`;
  const { data, error } = await (supabase as any)
    .from("cronograma_entries")
    .select("month,status")
    .gte("month", start)
    .lte("month", end)
    .order("month", { ascending: true });

  if (error) throw error;

  const grouped = new Map<string, { total: number; realizado: number; pendente: number; justificado: number }>();
  for (const row of (data ?? []) as StatusRow[]) {
    const current = grouped.get(row.month) ?? { total: 0, realizado: 0, pendente: 0, justificado: 0 };
    current.total += 1;
    if (row.status === "Realizado") current.realizado += 1;
    else if (row.status === "Pendente") current.pendente += 1;
    else if (row.status === "Justificado") current.justificado += 1;
    grouped.set(row.month, current);
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const current = grouped.get(month) ?? { total: 0, realizado: 0, pendente: 0, justificado: 0 };
    return {
      month,
      ...current,
      executionRate: current.total ? Math.round((current.realizado / current.total) * 100) : 0,
    };
  });
}
