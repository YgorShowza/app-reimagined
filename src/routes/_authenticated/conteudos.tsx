import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";

export const Route = createFileRoute("/_authenticated/conteudos")({
  head: () => ({ meta: [{ title: "Conteúdos · SEGEMPAT" }] }),
  component: KnowledgeWorkspace,
});
