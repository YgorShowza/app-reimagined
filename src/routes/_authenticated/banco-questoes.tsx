import { createFileRoute } from "@tanstack/react-router";
import { QuestionBankAdmin } from "@/components/question-bank/QuestionBankAdmin";

export const Route = createFileRoute("/_authenticated/banco-questoes")({
  head: () => ({
    meta: [
      { title: "Banco de Questões · SEGEMPAT" },
      { name: "description", content: "Gestão do banco de questões do SEGEMPAT." },
    ],
  }),
  component: QuestionBankAdmin,
});
