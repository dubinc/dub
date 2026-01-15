import { WorkspaceRole } from "@dub/prisma/client";
import {
  getPermissionsByRole,
  PermissionAction,
} from "../api/rbac/permissions";

/**
 * Server action variant: Throws an error if the user's role doesn't have the required role(s) or permission(s)
 * @param role - The workspace role of the user
 * @param requiredRoles - Array of required roles (optional)
 * @param requiredPermissions - Array of required permissions (optional)
 */
export function throwIfNoPermission({
  role,
  requiredRoles,
  requiredPermissions,
}: {
  role: WorkspaceRole;
  requiredRoles?: WorkspaceRole[];
  requiredPermissions?: PermissionAction[];
}) {
  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.includes(role)
  ) {
    throw new Error(
      `You don't have the required role to access this endpoint. Required role(s): ${requiredRoles.join(", ")}.`,
    );
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissions = getPermissionsByRole(role);
    const missingPermissions = requiredPermissions.filter(
      (p) => !permissions.includes(p),
    );

    if (missingPermissions.length === 0) {
      return;
    }

    throw new Error(
      `You don't have the necessary permissions to complete this request. Required permission(s): ${missingPermissions.join(", ")}.`,
    );
  }
}
