import { WorkspaceRole } from "@dub/prisma/client";
import { getPermissionsByRole, PermissionAction } from "../api/rbac/permissions";

/**
 * Server action variant: Throws an error if the user's role doesn't have the required permission(s)
 * @param role - The workspace role of the user
 * @param requiredPermissions - Array of required permissions (all must be present)
 */
export function throwIfNoPermission({
  role,
  requiredPermissions,
}: {
  role: WorkspaceRole;
  requiredPermissions: PermissionAction[];
}) {
  if (requiredPermissions.length === 0) {
    return;
  }

  const permissions = getPermissionsByRole(role);
  const missingPermissions = requiredPermissions.filter(
    (p) => !permissions.includes(p),
  );

  if (missingPermissions.length === 0) {
    return;
  }

  throw new Error(
    "You don't have the necessary permissions to complete this request.",
  );
}
