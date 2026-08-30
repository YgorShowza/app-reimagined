import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/provas")({
  head: () => ({ meta: [{ title: "Provas · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Provas" />,
});
