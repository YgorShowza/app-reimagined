import { createFileRoute } from "@tanstack/react-router";
import { EmBreve } from "@/components/EmBreve";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({ meta: [{ title: "TV Mode · SEGEMPAT" }] }),
  component: () => <EmBreve titulo="TV Mode" />,
});
