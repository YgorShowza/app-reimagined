import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CronogramaWorkspace } from "@/components/cronograma/CronogramaWorkspace";

export const Route = createFileRoute("/_authenticated/cronograma-gestao")({
  validateSearch: (search: Record<string, unknown>) => ({
    novo: search["novo"] === true || search["novo"] === "1" || search["novo"] === "true",
  }),
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

  return (
    <CronogramaWorkspace
      autoOpenNew={novo}
      onAutoOpenHandled={() => navigate({ to: "/cronograma-gestao", search: { novo: false }, replace: true })}
    />
  );
}
