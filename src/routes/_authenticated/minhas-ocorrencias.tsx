import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/minhas-ocorrencias")({
  head: () => ({ meta: [{ title: "Minhas Ocorrências · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Minhas Ocorrências" />,
});
