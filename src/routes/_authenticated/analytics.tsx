import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="Analytics" />,
});
