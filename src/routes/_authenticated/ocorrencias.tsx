import { createFileRoute } from "@tanstack/react-router";
import { OccurrencesWorkspace } from "@/components/occurrences/OccurrencesWorkspace";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências · SEGEMPAT" }] }),
  component: OccurrencesWorkspace,
});
