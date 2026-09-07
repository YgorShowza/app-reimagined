import { createFileRoute } from "@tanstack/react-router";
import { RefinedAuthScreen } from "@/components/auth/RefinedAuthScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SEGEMPAT — Gestão, Operações e Desempenho" },
      {
        name: "description",
        content:
          "Acesse o SEGEMPAT com sua matrícula: gestão de operações, treinamentos e desempenho das equipes do Porto de Maceió.",
      },
      { property: "og:title", content: "SEGEMPAT — Gestão, Operações e Desempenho" },
      {
        property: "og:description",
        content:
          "Plataforma de gestão de operações, treinamentos e desempenho das equipes do Porto de Maceió.",
      },
    ],
  }),
  component: RefinedAuthScreen,
});
