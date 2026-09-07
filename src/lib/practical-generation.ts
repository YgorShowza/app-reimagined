import { supabase } from "@/integrations/supabase/client";
import { apiRequest, isSegempatApiConfigured } from "@/lib/backend/api-client";

export interface PracticalGenerationResult {
  month: string;
  created: number;
  skipped: number;
  suspended: number;
  due_templates: number;
}

export async function generatePracticalEvaluationsMonth(
  month: string,
  templateId?: string | null,
): Promise<PracticalGenerationResult> {
  if (isSegempatApiConfigured()) {
    return apiRequest<PracticalGenerationResult>(
      "/api/operations/practical-evaluations/generate-month",
      {
        method: "POST",
        body: JSON.stringify({
          month,
          ...(templateId ? { template_id: templateId } : {}),
        }),
      },
    );
  }

  const { data, error } = await (supabase as any).rpc(
    "generate_practical_evaluations_month",
    {
      p_month: month,
      p_template_id: templateId ?? null,
    },
  );
  if (error) throw error;

  return {
    month: String(data?.month ?? month),
    created: Number(data?.created ?? 0),
    skipped: Number(data?.skipped ?? 0),
    suspended: Number(data?.suspended ?? 0),
    due_templates: Number(data?.due_templates ?? 0),
  };
}
