import { useState } from "react";
import { CalendarPlus, Loader2, Save, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { operationalMonth } from "@/lib/operational-time";
import { invalidateCronogramaFlow } from "@/lib/operational-query-sync";
import { generatePracticalEvaluationsMonth } from "@/lib/practical-generation";
import {
  listPracticalEvalTemplates,
  updatePracticalEvalTemplate,
  type PracticalEvalTemplate,
} from "@/lib/practical-templates";

const RECURRENCE_LABEL: Record<string, string> = {
  once: "Única vez",
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
};

export function PracticalRecurrencePanel() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [month, setMonth] = useState(operationalMonth());
  const [applicationDrafts, setApplicationDrafts] = useState<Record<string, number>>({});

  const templatesQuery = useQuery({
    queryKey: ["practical-eval-templates"],
    queryFn: listPracticalEvalTemplates,
    enabled: Boolean(user?.isAdmin),
  });
  const activeTemplates = (templatesQuery.data ?? []).filter((template) => template.status === "Ativo");

  const saveApplications = useMutation({
    mutationFn: async ({ template, applications }: { template: PracticalEvalTemplate; applications: number }) => {
      const normalized = Math.max(1, Math.min(31, Math.trunc(applications)));
      await updatePracticalEvalTemplate(template.id, { applications_per_month: normalized });
      return { id: template.id, applications: normalized };
    },
    onSuccess: async ({ id, applications }) => {
      setApplicationDrafts((current) => ({ ...current, [id]: applications }));
      await qc.invalidateQueries({ queryKey: ["practical-eval-templates"] });
      toast.success("Quantidade mensal atualizada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const generate = useMutation({
    mutationFn: () => generatePracticalEvaluationsMonth(month),
    onSuccess: async (result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["practical-evaluations"] }),
        invalidateCronogramaFlow(qc),
      ]);
      if (result.created > 0) {
        const suspended = result.suspended > 0 ? ` ${result.suspended} aplicação(ões) não encontrou(aram) data livre por suspensão/ausência.` : "";
        toast.success(`${result.created} avaliação(ões) prática(s) gerada(s) e sincronizada(s) com o Cronograma.${suspended}`);
        return;
      }
      toast.info(result.skipped > 0
        ? `Nenhuma nova avaliação gerada. ${result.skipped} aplicação(ões) já existia(m) para o período.`
        : "Nenhum modelo recorrente é devido para o mês selecionado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user?.isAdmin) return null;

  return (
    <section
      className="mx-auto mb-5 w-full max-w-6xl rounded-2xl p-4 md:p-5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card, var(--shadow-md))" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C8102E]" />
            <p className="text-sm font-black" style={{ color: "var(--text-1)" }}>Geração recorrente de avaliações práticas</p>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: "var(--text-4)" }}>
            Gera as aplicações previstas pelos modelos ativos, distribui as datas no mês, respeita suspensões e sincroniza cada avaliação com um lançamento próprio no Cronograma. Repetir a geração não duplica os mesmos slots.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="sm:w-44"
            aria-label="Mês de geração das avaliações práticas"
          />
          <Button
            onClick={() => generate.mutate()}
            disabled={!month || generate.isPending || templatesQuery.isLoading || activeTemplates.length === 0}
            className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]"
          >
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Gerar recorrências
          </Button>
        </div>
      </div>

      {templatesQuery.isError ? (
        <div className="mt-4 rounded-xl p-3 text-xs font-semibold text-red-500" style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)" }}>
          Não foi possível carregar os modelos recorrentes.
        </div>
      ) : activeTemplates.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {activeTemplates.map((template) => {
            const applications = applicationDrafts[template.id] ?? Number(template.applications_per_month || 1);
            const isOnce = template.recurrence === "once";
            return (
              <div key={template.id} className="flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black" style={{ color: "var(--text-1)" }}>{template.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold" style={{ color: "var(--text-4)" }}>
                    {template.target_sector} · {RECURRENCE_LABEL[template.recurrence] ?? template.recurrence}
                  </p>
                </div>
                {isOnce ? (
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--text-4)" }}>1 aplicação</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--text-4)" }}>Aplicações/mês</span>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={applications}
                      onChange={(event) => setApplicationDrafts((current) => ({
                        ...current,
                        [template.id]: Math.max(1, Math.min(31, Number(event.target.value) || 1)),
                      }))}
                      className="h-8 w-16 text-center text-xs"
                      aria-label={`Aplicações mensais de ${template.title}`}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={saveApplications.isPending || applications === Number(template.applications_per_month || 1)}
                      onClick={() => saveApplications.mutate({ template, applications })}
                      aria-label={`Salvar aplicações mensais de ${template.title}`}
                    >
                      {saveApplications.isPending && saveApplications.variables?.template.id === template.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !templatesQuery.isLoading ? (
        <p className="mt-4 text-xs" style={{ color: "var(--text-4)" }}>Nenhum modelo ativo. Cadastre ou ative um modelo em “Modelos” antes de gerar recorrências.</p>
      ) : null}
    </section>
  );
}
