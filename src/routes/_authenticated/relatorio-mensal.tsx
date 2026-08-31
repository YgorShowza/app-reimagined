import { createFileRoute } from "@tanstack/react-router";
import { MonthlyReportWorkspace } from "@/components/reports/MonthlyReportWorkspace";

export const Route = createFileRoute("/_authenticated/relatorio-mensal")({
  head: () => ({
    meta: [
      { title: "Relatório Mensal · SEGEMPAT" },
      { name: "description", content: "Fechamento mensal individual de avaliações e execução do cronograma." },
    ],
  }),
  component: MonthlyReportWorkspace,
});
