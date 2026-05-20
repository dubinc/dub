import { WorkspaceEnvironment, WorkspaceRole } from "@dub/prisma/client";
import { combineWords } from "@dub/utils";
import { PermissionAction, ROLE_PERMISSIONS } from "./api/rbac/permissions";

export const clientAccessCheck = ({
  action,
  role,
  customPermissionDescription,
  environment,
}: {
  action: PermissionAction;
  role: WorkspaceRole;
  customPermissionDescription?: string;
  environment?: WorkspaceEnvironment | null;
}) => {
  if (environment === WorkspaceEnvironment.staging) {
    return {
      allowed: false,
      error: "This setting is managed from the live workspace.",
    };
  }

  const permission = ROLE_PERMISSIONS.find((p) => p.action === action)!;
  const allowedWorkspaceRoles = permission.roles;
  const allowed = allowedWorkspaceRoles.includes(role);

  if (allowed) {
    return {
      allowed,
      error: false,
    };
  }

  return {
    allowed,
    error: `Only workspace ${combineWords(allowedWorkspaceRoles.map((r) => `${r === "billing" ? "billing user" : r}s`))} can ${customPermissionDescription || permission.description}.`,
  };
};
