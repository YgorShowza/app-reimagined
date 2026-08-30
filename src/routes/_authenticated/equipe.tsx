import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Equipe" />,
});
