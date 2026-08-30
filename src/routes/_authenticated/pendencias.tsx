import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({ meta: [{ title: "Pendências · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Pendências" />,
});
