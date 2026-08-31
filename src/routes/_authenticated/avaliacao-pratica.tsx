import { createFileRoute } from "@tanstack/react-router";
import { PracticalWorkspace } from "@/components/practical/PracticalWorkspace";

export const Route = createFileRoute("/_authenticated/avaliacao-pratica")({
  head: () => ({ meta: [{ title: "Avaliação Prática · SEGEMPAT" }] }),
  component: PracticalWorkspace,
});
