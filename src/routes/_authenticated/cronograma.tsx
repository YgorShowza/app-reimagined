import { createFileRoute } from "@tanstack/react-router";
import { CronogramaWorkspace } from "@/components/cronograma/CronogramaWorkspace";

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma · SEGEMPAT" },
      { name: "description", content: "Centro de planejamento, execução, pendências, recorrências e suspensões do SEGEMPAT." },
    ],
  }),
  component: CronogramaWorkspace,
});
