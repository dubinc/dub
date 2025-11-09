import "server-only";
import { DubApiError } from "../errors";
import { PermissionAction } from "../rbac/permissions";
import { prefixWorkspaceId } from "../workspaces/workspace-id";

// Check if the required scope is in the list of user scopes
export const throwIfNoAccess = ({
  permissions,
  requiredPermissions,
  workspaceId,
  externalRequest = false,
}: {
  permissions: PermissionAction[]; // user or token permissions
  requiredPermissions: PermissionAction[];
  workspaceId: string;
  externalRequest?: boolean;
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

  const message = externalRequest
    ? `The provided key does not have the required permissions for this endpoint on the workspace '${prefixWorkspaceId(workspaceId)}'. Having the '${missingPermissions.join(" ")}' permission would allow this request to continue.`
    : "You don't have the necessary permissions to complete this request.";

  throw new DubApiError({
    code: "forbidden",
    message,
  });
};
