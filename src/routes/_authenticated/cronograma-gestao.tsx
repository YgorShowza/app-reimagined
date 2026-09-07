import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CronogramaWorkspace } from "@/components/cronograma/CronogramaWorkspace";
import { invalidateCronogramaFlow } from "@/lib/operational-query-sync";

export const Route = createFileRoute("/_authenticated/cronograma-gestao")({
  validateSearch: (search: Record<string, unknown>): { novo?: boolean } => {
    const novo = search["novo"] === true || search["novo"] === "1" || search["novo"] === "true";
    return novo ? { novo: true } : {};
  },
  head: () => ({
    meta: [
      { title: "Cronograma · SEGEMPAT" },
      { name: "description", content: "Centro de planejamento, execução, pendências, recorrências e suspensões do SEGEMPAT." },
    ],
  }),
  component: CronogramaGestaoPage,
});

function CronogramaGestaoPage() {
  const { novo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      // Ao sair da gestão, força a próxima tela a ler o estado mais recente do
      // Cronograma e recalcular os indicadores operacionais dependentes.
      void invalidateCronogramaFlow(queryClient);
    };
  }, [queryClient]);

  return (
    <div className="segempat-operational-cronograma-management min-w-0 w-full">
      <CronogramaWorkspace
        autoOpenNew={Boolean(novo)}
        onAutoOpenHandled={() => navigate({ to: "/cronograma-gestao", search: {}, replace: true })}
      />
    </div>
  );
}
