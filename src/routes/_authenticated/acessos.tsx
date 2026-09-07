import { createFileRoute } from "@tanstack/react-router";
import { AccessActivationAdmin } from "@/components/access/AccessActivationAdmin";

function AccessPage() {
  return (
    <div className="segempat-governance-access">
      <AccessActivationAdmin />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/acessos")({
  head: () => ({ meta: [{ title: "Primeiro acesso · SEGEMPAT" }] }),
  component: AccessPage,
});
