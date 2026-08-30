import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/progresso")({
  head: () => ({ meta: [{ title: "Progresso · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Progresso" />,
});
