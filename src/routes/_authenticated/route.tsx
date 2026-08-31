import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

const OPERATOR_ROUTES = new Set([
  "/painel",
  "/provas",
  "/prova-realizar",
  "/pendencias",
  "/progresso",
  "/certificados",
  "/pratico",
  "/minhas-ocorrencias",
  "/meu-perfil",
]);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (roleError) throw redirect({ to: "/" });

    const isAdmin = (roles ?? []).some((item) => item.role === "admin");
    const pathname = location.pathname.replace(/\/$/, "") || "/";

    if (!isAdmin && !OPERATOR_ROUTES.has(pathname)) {
      throw redirect({ to: "/painel" });
    }

    return { user: data.user, isAdmin };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
