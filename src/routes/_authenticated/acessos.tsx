import { createFileRoute } from "@tanstack/react-router";
import { AccessActivationAdmin } from "@/components/access/AccessActivationAdmin";
import { AccessCredentialAdministration } from "@/components/access/AccessCredentialAdministration";
import { PermissionAdministration } from "@/components/access/PermissionAdministration";
import { hasPermission } from "@/lib/access-control";
import { useCurrentUser } from "@/lib/useCurrentUser";

function AccessPage() {
  const { data: user } = useCurrentUser();
  const canIdentity = hasPermission(user, "access.identity.manage");
  const canReset = hasPermission(user, "access.password_reset");
  const canManagePermissions = hasPermission(user, "access.permissions.manage");

  return (
    <div className="segempat-governance-access space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Acessos</h2>
        <p className="text-muted-foreground">
          Primeiro acesso, recuperação segura de senha e autorização por níveis e permissões.
        </p>
      </div>

      {canIdentity && canReset ? (
        <AccessActivationAdmin />
      ) : (
        <>
          {canIdentity && <AccessCredentialAdministration mode="activation" />}
          {canReset && <AccessCredentialAdministration mode="reset" />}
        </>
      )}

      {canManagePermissions && <PermissionAdministration />}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/acessos")({
  component: AccessPage,
});
