import { combineWords } from "@dub/utils";
import { Role } from "@prisma/client";
import { DubApiError } from "../errors";
import { PermissionAction, ROLE_PERMISSIONS } from "../rbac/permissions";

// Check if the required scope is in the list of user scopes
export const throwIfNoAccess = ({
  permissions,
  requiredPermissions,
  workspaceId,
}: {
  permissions: PermissionAction[]; // user or token permissions
  requiredPermissions: PermissionAction[];
  workspaceId: string;
}) => {
  if (requiredPermissions.length === 0) {
    return;
  }

  const missingPermissions = requiredPermissions.filter(
    (p) => !permissions.includes(p),
  );

  if (missingPermissions.length === 0) {
    return;
  }

  throw new DubApiError({
    code: "forbidden",
    message: `The provided key does not have the required permissions for this endpoint on the workspace 'ws_${workspaceId}'. Having the '${missingPermissions.join(" ")}' permission would allow this request to continue.`,
  });
};

export const clientAccessCheck = ({
  action,
  role,
  customPermissionDescription,
}: {
  action: PermissionAction;
  role: Role;
  customPermissionDescription?: string;
}) => {
  const permission = ROLE_PERMISSIONS.find((p) => p.action === action)!;
  const allowedRoles = permission.roles;

  if (allowedRoles.includes(role)) {
    return {
      error: false,
    };
  }

  return {
    error: `Only workspace ${combineWords(allowedRoles.map((r) => `${r}s`))} can ${customPermissionDescription || permission.description}.`,
  };
};
