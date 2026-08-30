import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/ia-base")({
  head: () => ({ meta: [{ title: "IA Base · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="IA Base" />,
});
