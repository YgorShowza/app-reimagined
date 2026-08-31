import { createFileRoute } from "@tanstack/react-router";
import { AccessActivationAdmin } from "@/components/access/AccessActivationAdmin";

export const Route = createFileRoute("/_authenticated/acessos")({
  head: () => ({ meta: [{ title: "Primeiro acesso · SEGEMPAT" }] }),
  component: AccessActivationAdmin,
});
