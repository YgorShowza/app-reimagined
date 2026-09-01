import { supabase } from "@/integrations/supabase/client";

export type AtomicCronogramaImportRow = {
  matricula: string;
  tema: string;
  nota: number;
  month: string;
  completion_date: string;
};

export type AtomicCronogramaImportResult = {
  updated: number;
  created: number;
  ignored: number;
};

export async function importCronogramaResultsAtomic(rows: AtomicCronogramaImportRow[]): Promise<AtomicCronogramaImportResult> {
  if (!rows.length) return { updated: 0, created: 0, ignored: 0 };
  const { data, error } = await (supabase as any).rpc("import_cronograma_results", { p_rows: rows });
  if (error) throw error;
  return {
    updated: Number(data?.updated ?? 0),
    created: Number(data?.created ?? 0),
    ignored: Number(data?.ignored ?? 0),
  };
}
