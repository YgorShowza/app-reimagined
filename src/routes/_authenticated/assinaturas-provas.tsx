import { createFileRoute } from "@tanstack/react-router";
import { ExamSignaturesWorkspace } from "@/components/certificates/ExamSignaturesWorkspace";

function ExamSignaturesPage() {
  return (
    <div className="segempat-training-signatures">
      <ExamSignaturesWorkspace />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/assinaturas-provas")({
  head: () => ({ meta: [{ title: "Assinaturas de Provas · SEGEMPAT" }] }),
  component: ExamSignaturesPage,
});
