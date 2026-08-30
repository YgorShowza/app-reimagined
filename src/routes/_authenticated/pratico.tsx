import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/pratico")({
  head: () => ({ meta: [{ title: "Avaliação Prática · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Avaliação Prática" />,
});
