import { createFileRoute } from "@tanstack/react-router";
import { SecurityDocumentWorkspace } from "@/components/security/SecurityDocumentWorkspace";

export const Route = createFileRoute("/_authenticated/documento-seguranca")({
  head: () => ({
    meta: [
      { title: "Documento de Segurança · SEGEMPAT" },
      { name: "description", content: "Arquitetura, controles implementados e pontos de homologação de segurança do SEGEMPAT." },
    ],
  }),
  component: SecurityDocumentWorkspace,
});
