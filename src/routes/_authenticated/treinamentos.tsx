import { createFileRoute } from "@tanstack/react-router";
import { TrainingLibrary } from "@/components/training/TrainingLibrary";

export const Route = createFileRoute("/_authenticated/treinamentos")({
  head: () => ({
    meta: [
      { title: "Treinamentos · SEGEMPAT" },
      { name: "description", content: "Módulos de treinamento disponíveis no SEGEMPAT." },
    ],
  }),
  component: TrainingLibrary,
});
