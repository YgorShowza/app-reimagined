import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/individual")({
  head: () => ({ meta: [{ title: "Análise Individual · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Análise Individual" />,
});
