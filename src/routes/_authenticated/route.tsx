import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AppLayoutV2 } from "@/components/AppLayoutV2";
import { DemoModeBadge } from "@/components/DemoModeBadge";
import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";

const ADMIN_ONLY_PATHS = new Set([
  "/admin",
  "/atencao",
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

function AuthenticatedShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/tv") return <Outlet />;
  return (
    <AppLayoutV2>
      <DemoModeBadge />
      <Outlet />
    </AppLayoutV2>
  );
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
  component: AuthenticatedShell,
});
