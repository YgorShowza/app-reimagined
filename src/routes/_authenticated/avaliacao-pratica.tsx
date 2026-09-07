import { createFileRoute } from "@tanstack/react-router";
import { PracticalRecurrencePanel } from "@/components/practical/PracticalRecurrencePanel";
import { PracticalWorkspace } from "@/components/practical/PracticalWorkspace";

function PracticalAdminPage() {
  return (
    <div className="segempat-training-practical">
      <PracticalRecurrencePanel />
      <PracticalWorkspace />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/avaliacao-pratica")({
  head: () => ({ meta: [{ title: "Avaliação Prática · SEGEMPAT" }] }),
  component: PracticalAdminPage,
});
