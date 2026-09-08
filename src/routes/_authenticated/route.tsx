import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AppLayoutV2 } from "@/components/AppLayoutV2";
import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";
import { canAccessAdminPath, firstAllowedAdminPath, requiredPermissionsForPath } from "@/lib/access-control";

export const ADMIN_ONLY_PATHS = new Set([
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

export const OPERATOR_DESKTOP_PATHS = new Set([
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

export const INSPECTOR_DESKTOP_PATHS = new Set([
  "/atencao",
  "/risco",
  "/ia-base",
  "/provas-criar",
  "/modulos-treinamento",
  "/validar-certificados",
]);

function canonicalPathname(pathname: string) {
  return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isAdminOnlyPath(pathname: string) {
  const canonicalPath = canonicalPathname(pathname);
  return ADMIN_ONLY_PATHS.has(canonicalPath) || canonicalPath.startsWith("/certificado/");
}

function AuthenticatedShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const canonicalPath = canonicalPathname(pathname);
  const isOperatorDesktopRoute = OPERATOR_DESKTOP_PATHS.has(canonicalPath);
  const isInspectorDesktopRoute = INSPECTOR_DESKTOP_PATHS.has(canonicalPath);

  if (canonicalPath === "/tv") return <Outlet />;
  return (
    <AppLayoutV2>
      <div
        className={[
          isOperatorDesktopRoute ? "segempat-operator-desktop" : "",
          isInspectorDesktopRoute ? "segempat-inspector-desktop" : "",
        ].filter(Boolean).join(" ") || undefined}
        data-operator-route={isOperatorDesktopRoute ? canonicalPath : undefined}
        data-inspector-route={isInspectorDesktopRoute ? canonicalPath : undefined}
      >
        <Outlet />
      </div>
    </AppLayoutV2>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentSessionUser();
    if (!user) throw redirect({ to: "/" });

    const pathname = canonicalPathname(location.pathname);
    if (isAdminOnlyPath(pathname) && !user.isAdmin) {
      throw redirect({ to: "/painel" });
    }

    // Rotas compartilhadas, como Provas e Conteúdos, continuam disponíveis ao
    // Operador. Para contas administrativas, porém, a permissão granular passa
    // a ser obrigatória e a navegação não substitui a autorização da API.
    const controlledPermissions = requiredPermissionsForPath(pathname);
    if (user.isAdmin && controlledPermissions && !canAccessAdminPath(user, pathname)) {
      throw redirect({ to: firstAllowedAdminPath(user) });
    }
  },
  component: AuthenticatedShell,
});
