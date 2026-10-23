import { combineWords } from "@dub/utils";
import { WorkspaceEnvironment, WorkspaceRole } from "@prisma/client";
import { PermissionAction, ROLE_PERMISSIONS } from "./api/rbac/permissions";

function getDefaultRestrictedEnvironmentMessage(
  restrictedEnvironments: WorkspaceEnvironment[],
) {
  if (
    restrictedEnvironments.length === 1 &&
    restrictedEnvironments[0] === WorkspaceEnvironment.staging
  ) {
    return "This setting must be managed from the production workspace.";
  }

  const labels = restrictedEnvironments.map((env) => `${env} workspaces`);
  return `This action is not available in ${combineWords(labels)}.`;
}

export const clientAccessCheck = ({
  action,
  role,
  customPermissionDescription,
  environment,
  restrictedEnvironments,
  restrictedEnvironmentMessage,
}: {
  action: PermissionAction;
  role: WorkspaceRole;
  customPermissionDescription?: string;
  environment?: WorkspaceEnvironment | null; // Current workspace environment
  restrictedEnvironments?: WorkspaceEnvironment[]; // Environments where the action is restricted
  restrictedEnvironmentMessage?: string; // Custom message to display when the action is restricted
}) => {
  if (
    environment &&
    restrictedEnvironments &&
    restrictedEnvironments.includes(environment)
  ) {
    return {
      allowed: false,
      error:
        restrictedEnvironmentMessage ??
        getDefaultRestrictedEnvironmentMessage(restrictedEnvironments),
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
