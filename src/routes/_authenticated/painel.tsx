import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Início · SEGEMPAT" },
      {
        name: "description",
        content: "Painel do operador no SEGEMPAT — pendências, progresso e desempenho no Porto de Maceió.",
      },
    ],
  }),
  component: Painel,
  errorComponent: () => (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-sm" style={{ color: "var(--text-3)" }}>
        Não foi possível carregar seu painel. Tente novamente.
      </p>
    </div>
  ),
});

function Painel() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <h1
        className="text-2xl font-black tracking-tight"
        style={{ color: "var(--text-1)", fontFamily: "var(--font-heading)" }}
      >
        {isLoading ? "Carregando…" : `Olá, ${user?.nome?.split(" ")[0] ?? "colaborador"}`}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
        Matrícula {user?.matricula ?? "—"} · Porto de Maceió
      </p>

      <div
        className="mt-6 flex items-start gap-3 rounded-2xl p-4"
        style={{
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <ShieldCheck className="mt-0.5 h-5 w-5" style={{ color: "var(--accent)" }} />
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
            Acesso autenticado
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
            Sua conta está ativa. As demais telas do app (pendências, progresso, certificados)
            serão liberadas aqui conforme forem portadas.
          </p>
        </div>
      </div>
    </div>
  );
}
