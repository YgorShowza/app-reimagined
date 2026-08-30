import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/provas-criar")({
  head: () => ({ meta: [{ title: "Criar Prova · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Criar Prova" />,
});
