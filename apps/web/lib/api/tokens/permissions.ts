import { DubApiError } from "../errors";
import { Scope } from "./scopes";

// Check if the required scope is in the list of user scopes
export const throwIfNoAccess = ({
  scopes,
  requiredScopes,
  workspaceId,
}: {
  scopes: Scope[];
  requiredScopes: Scope[];
  workspaceId: string;
}) => {
  if (requiredScopes.length === 0) {
    return;
  }

  const missingScopes = requiredScopes
    .filter((requiredScope) => !scopes.includes(requiredScope))
    .join(", ");

  for (const requiredScope of requiredScopes) {
    if (!scopes.includes(requiredScope)) {
      throw new DubApiError({
        code: "forbidden",
        message: `The provided key does not have the required permissions for this endpoint on the workspace 'ws_${workspaceId}'. Having the '${missingScopes}' permission would allow this request to continue.`,
      });
    }
  }
};
