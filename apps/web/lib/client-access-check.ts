import { WorkspaceEnvironment, WorkspaceRole } from "@dub/prisma/client";
import { combineWords } from "@dub/utils";
import { PermissionAction, ROLE_PERMISSIONS } from "./api/rbac/permissions";

export const clientAccessCheck = ({
  action,
  role,
  customPermissionDescription,
  environment,
  stagingBehavior,
}: {
  action: PermissionAction;
  role: WorkspaceRole;
  customPermissionDescription?: string;
  environment?: WorkspaceEnvironment | null;
  stagingBehavior?: "blocked" | "production-only";
}) => {
  if (environment === WorkspaceEnvironment.staging) {
    switch (stagingBehavior) {
      case "blocked":
        return {
          allowed: false,
          error: "This action is not available in staging workspaces.",
        };

      case "production-only":
        return {
          allowed: false,
          error: "This setting must be managed from the production workspace.",
        };
    }
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
