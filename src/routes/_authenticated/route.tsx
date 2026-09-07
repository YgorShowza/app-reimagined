import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DemoModeBadge } from "@/components/DemoModeBadge";
import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";

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
  "/ia-base",
  "/avaliacao-pratica",
  "/resumos",
  "/ocorrencias",
  "/oportunidades",
  "/foco",
]);

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PATHS.has(pathname) || pathname.startsWith("/certificado/");
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getCurrentSessionUser();
    if (!user) throw redirect({ to: "/" });

    if (isAdminOnlyPath(location.pathname) && !user.isAdmin) {
      throw redirect({ to: "/painel" });
    }

    return { user };
  },
  component: () => (
    <AppLayout>
      <DemoModeBadge />
      <Outlet />
    </AppLayout>
  ),
});
