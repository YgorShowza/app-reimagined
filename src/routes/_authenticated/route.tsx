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

const OPERATOR_DESKTOP_PATHS = new Set([
  "/painel",
  "/pendencias",
  "/provas",
  "/progresso",
  "/certificados",
  "/treinamentos",
  "/conteudos",
  "/meu-perfil",
  "/pratico",
  "/minhas-ocorrencias",
  "/prova-realizar",
  "/teste-rapido",
  "/simulador",
  "/stress-test",
  "/desafio-diario",
]);

const INSPECTOR_DESKTOP_PATHS = new Set([
  "/atencao",
  "/risco",
  "/ia-base",
  "/provas-criar",
  "/modulos-treinamento",
  "/validar-certificados",
]);

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PATHS.has(pathname) || pathname.startsWith("/certificado/");
}

function AuthenticatedShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/tv") return <Outlet />;
  const operatorDesktopRoute = OPERATOR_DESKTOP_PATHS.has(pathname) ? pathname : null;
  const inspectorDesktopRoute = INSPECTOR_DESKTOP_PATHS.has(pathname) ? pathname : null;
  return (
    <AppLayoutV2>
      <DemoModeBadge />
      {operatorDesktopRoute ? (
        <div className="segempat-operator-desktop min-w-0 w-full" data-operator-route={operatorDesktopRoute}>
          <Outlet />
        </div>
      ) : inspectorDesktopRoute ? (
        <div className="segempat-inspector-desktop min-w-0 w-full" data-inspector-route={inspectorDesktopRoute}>
          <Outlet />
        </div>
      ) : (
        <Outlet />
      )}
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
