import { createFileRoute } from "@tanstack/react-router";
import { CronogramaSourceParity } from "@/components/cronograma/CronogramaSourceParity";

export const Route = createFileRoute("/_authenticated/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma · SEGEMPAT" },
      { name: "description", content: "Cronograma de treinamentos com visões Lista, Calendário e Ano." },
    ],
  }),
  component: CronogramaSourceParity,
});
