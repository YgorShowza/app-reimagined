import { createFileRoute } from "@tanstack/react-router";
import { IndividualAnalysisV2 } from "@/components/individual-analysis/IndividualAnalysisV2";

export const Route = createFileRoute("/_authenticated/individual")({
  head: () => ({ meta: [{ title: "Análise Individual · SEGEMPAT" }] }),
  component: IndividualAnalysisV2,
});
