import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/conteudos")({
  head: () => ({ meta: [{ title: "Conteúdos · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Conteúdos" />,
});
