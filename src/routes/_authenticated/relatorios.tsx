import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Relatórios" />,
});
