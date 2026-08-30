import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/foco")({
  head: () => ({ meta: [{ title: "Foco do Mês · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Foco do Mês" />,
});
