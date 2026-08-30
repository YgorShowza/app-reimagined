import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/resumos")({
  head: () => ({ meta: [{ title: "Resumos · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Resumos" />,
});
