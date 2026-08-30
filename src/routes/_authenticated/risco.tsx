import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/risco")({
  head: () => ({ meta: [{ title: "Zona de Risco · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Zona de Risco" />,
});
