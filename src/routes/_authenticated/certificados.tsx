import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Certificados" />,
});
