import { createFileRoute } from "@tanstack/react-router";
import { ExamSignaturesWorkspace } from "@/components/certificates/ExamSignaturesWorkspace";

export const Route = createFileRoute("/_authenticated/assinaturas-provas")({
  head: () => ({ meta: [{ title: "Assinaturas de Provas · SEGEMPAT" }] }),
  component: ExamSignaturesWorkspace,
});
