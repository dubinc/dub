import { DubApiError } from "../errors";
import { PermissionAction } from "./scopes";

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
