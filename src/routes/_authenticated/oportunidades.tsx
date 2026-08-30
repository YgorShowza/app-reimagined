import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Oportunidades" />,
});
