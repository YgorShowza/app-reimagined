import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";

const LOGO_URL =
  "https://media.base44.com/images/public/6a1117d573bbf85981b1abee/8271ac857_IMG_9226.png";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel · SEGEMPAT" },
      {
        name: "description",
        content:
          "Painel interno do SEGEMPAT com dados da sua conta, operações e desempenho no Porto de Maceió.",
      },
      { property: "og:title", content: "Painel · SEGEMPAT" },
      {
        property: "og:description",
        content: "Área autenticada do SEGEMPAT para gestão de operações e desempenho.",
      },
    ],
  }),
  component: Painel,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm" style={{ color: "var(--text-3)" }}>
        Não foi possível carregar seu painel. Tente novamente.
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm" style={{ color: "var(--text-3)" }}>
        Página não encontrada.
      </p>
    </div>
  ),
});

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const id = userData.user?.id;
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("matricula, nome")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <header
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: "var(--header-bg)", borderBottom: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center overflow-hidden rounded-xl"
            style={{ background: "#fff", padding: "6px 10px" }}
          >
            <img src={LOGO_URL} alt="Logotipo EMPAT" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-1)" }}>
              SEGEMPAT
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
              Painel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={handleSignOut}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>
          {isLoading ? "Carregando…" : `Olá, ${profile?.nome ?? "colaborador"}`}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
          Matrícula {profile?.matricula ?? "—"} · Porto de Maceió
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
              Sua conta está ativa. As demais telas do app (dashboards, treinamentos, ocorrências)
              serão liberadas aqui conforme forem portadas.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
