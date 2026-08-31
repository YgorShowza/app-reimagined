import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

const ADMIN_ONLY_PATHS = new Set([
  "/admin",
  "/equipe",
  "/acessos",
  "/analytics",
  "/risco",
  "/individual",
  "/radar-analises",
  "/relatorios",
  "/relatorio-mensal",
  "/tv",
  "/auditoria",
  "/documento-seguranca",
  "/cronograma",
  "/cronograma-gestao",
  "/provas-criar",
  "/banco-questoes",
  "/modulos-treinamento",
  "/ciclos-treinamento",
  "/validar-certificados",
  "/assinaturas-provas",
  "/conteudos",
  "/ia-base",
  "/avaliacao-pratica",
  "/resumos",
  "/ocorrencias",
  "/oportunidades",
  "/foco",
]);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      throw redirect({ to: "/" });
    }

    const [{ data: roleRow, error: roleError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("matricula")
          .eq("id", data.user.id)
          .maybeSingle(),
      ]);

    const isAdmin = !roleError && roleRow?.role === "admin";

    if (!isAdmin) {
      if (profileError || !profile?.matricula) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({ to: "/" });
      }

      const { data: activeEmployee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("matricula", profile.matricula)
        .eq("status", "Ativo")
        .maybeSingle();

      if (employeeError || !activeEmployee) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({ to: "/" });
      }
    }

    if (ADMIN_ONLY_PATHS.has(location.pathname) && !isAdmin) {
      throw redirect({ to: "/painel" });
    }

    return { user: data.user };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
