import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[granular-access-control] ausente: ${label}`);
    process.exitCode = 1;
  }
}

const migration = read("database/mysql/010_granular_access_control.sql");
const authorization = read("server/src/authorization.js");
const authorizationRoute = read("server/src/routes/authorization.js");
const session = read("server/src/session.js");
const app = read("server/src/app.js");
const auth = read("server/src/routes/auth.js");
const bootstrap = read("server/scripts/bootstrap-admin.js");
const manageInspector = read("server/scripts/manage-inspector-access.js");
const privilegedReport = read("server/scripts/report-privileged-access.js");
const accessRoute = read("src/routes/_authenticated/acessos.tsx");
const authenticatedRoute = read("src/routes/_authenticated/route.tsx");
const frontendAccessControl = read("src/lib/access-control.ts");
const authorizationGateway = read("src/lib/backend/authorization-gateway.ts");
const permissionUi = read("src/components/access/PermissionAdministration.tsx");
const integrationWorkflow = read(".github/workflows/mysql-integration.yml");

for (const table of [
  "access_levels",
  "access_permissions",
  "access_level_permissions",
  "user_access_levels",
  "user_permission_overrides",
]) {
  requireText(migration, `CREATE TABLE ${table}`, `tabela MySQL ${table}`);
  requireText(app, `"${table}"`, `readiness da tabela ${table}`);
}

for (const level of ["master", "admin", "inspector", "operator"]) {
  requireText(migration, `('${level}'`, `nível ${level} na migration`);
  requireText(authorization, `code: "${level}"`, `nível ${level} no motor de autorização`);
}

requireText(migration, "('access.permissions.manage', 'Gerenciar níveis e permissões', 'Segurança', 210, 1)", "permissão de gestão marcada como exclusiva do Master");
requireText(migration, "THEN 'master'", "preservação de admins legados como Master");
requireText(authorization, "masterOnly: true", "permissão master-only no backend");
requireText(authorization, "enforceGranularApiPermissions", "enforcement global no backend");
requireText(authorization, "access.permissions.manage", "proteção da gestão de permissões");
requireText(authorization, "access.password_reset", "proteção granular de recuperação de senha");

requireText(auth, "const initialAccessLevel = employee.access_profile === \"Inspetor\" ? \"inspector\" : \"operator\"", "ativação futura em menor privilégio");
requireText(auth, "INSERT INTO user_access_levels", "persistência do nível no primeiro acesso");
if (auth.includes("initialAccessLevel = employee.access_profile === \"Inspetor\" ? \"master\"")) {
  console.error("[granular-access-control] ativação de novo Inspetor não pode promover diretamente a Master");
  process.exitCode = 1;
}

requireText(session, "loadAuthorization", "carregamento da autorização na sessão");
requireText(session, "permissions: authorization.permissions", "permissões expostas no contexto autenticado");
requireText(session, "accessLevel: authorization.accessLevel", "nível exposto no contexto autenticado");

requireText(authorizationRoute, "targetUserId === req.user.id", "bloqueio de alteração própria");
requireText(authorizationRoute, "Não é permitido remover o último Administrador Master", "proteção do último Master");
requireText(authorizationRoute, "FOR UPDATE", "locks transacionais de privilégio");
requireText(authorizationRoute, "session_epoch = session_epoch + 1", "invalidação imediata de sessões");
requireText(authorizationRoute, '"UPDATE_ACCESS_CONTROL"', "auditoria de alteração de privilégios");
requireText(authorizationRoute, "master_only_not_delegable", "proteção de permissão exclusiva do Master");

requireText(app, 'app.use("/api", enforceGranularApiPermissions)', "middleware global de autorização");
requireText(app, 'app.use("/api/authorization", authorizationRouter)', "API de administração de permissões");

requireText(frontendAccessControl, "canAccessAdminPath", "contrato de autorização de rotas no frontend");
requireText(authenticatedRoute, "canAccessAdminPath", "guard de rota com permissões");
requireText(accessRoute, "PermissionAdministration", "painel de níveis e permissões na Governança");
requireText(permissionUi, "Conta atual · protegida", "proteção visual da conta atual");
requireText(permissionUi, "Salvar nível e permissões", "editor granular de permissões");

requireText(authorizationGateway, "isDemoModeAllowed", "isolamento do modo demonstração");
requireText(authorizationGateway, 'matricula: "000001"', "conta Master fictícia de demonstração");
requireText(authorizationGateway, 'matricula: "100101"', "conta Operador fictícia de demonstração");

requireText(bootstrap, "level_code, updated_by", "bootstrap grava nível granular");
requireText(bootstrap, "'master'", "bootstrap cria primeiro Administrador Master");
requireText(bootstrap, "session_epoch = session_epoch + 1", "bootstrap revoga sessões anteriores");

requireText(manageInspector, "level_code = 'inspector'", "script TI concede nível Inspector");
requireText(manageInspector, "level_code = 'operator'", "script TI revoga para Operador");
requireText(manageInspector, 'previousLevel === "master"', "script TI protege conta Master");
requireText(manageInspector, "session_epoch = session_epoch + 1", "script TI invalida sessões");

requireText(privilegedReport, "user_access_levels", "relatório TI usa níveis granulares");
requireText(privilegedReport, "effectivePermissions", "relatório TI calcula permissões efetivas");
requireText(integrationWorkflow, '\"version\":\"010\"', "integração MySQL exige migration 010");

if (process.exitCode) process.exit(process.exitCode);
console.log("SEGEMPAT granular access control contract: OK");
