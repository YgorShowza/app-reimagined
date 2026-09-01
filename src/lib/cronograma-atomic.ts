import { supabase } from "@/integrations/supabase/client";
import type { CronogramaEntryInput } from "@/lib/cronograma";

export async function createCronogramaEntriesAtomic(entries: CronogramaEntryInput[]) {
  if (!entries.length) return { created: 0 };

  const { data, error } = await (supabase as any).rpc("create_cronograma_entries_atomic", {
    p_rows: entries,
  });

  if (error) throw error;
  return { created: Number(data?.created ?? entries.length) };
}
