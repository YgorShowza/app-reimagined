import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Auditoria" />,
});
