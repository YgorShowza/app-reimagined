import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/radar-analises")({
  head: () => ({ meta: [{ title: "Radar Analítico · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Radar Analítico" />,
});
