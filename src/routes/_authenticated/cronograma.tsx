import { createFileRoute } from "@tanstack/react-router";
import { CronogramaPremiumShell } from "@/components/cronograma/CronogramaPremiumShell";

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma · SEGEMPAT" },
      { name: "description", content: "Centro de planejamento, execução, pendências, recorrências e suspensões do SEGEMPAT." },
    ],
  }),
  component: CronogramaPremiumShell,
});
