import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Ocorrências" />,
});
