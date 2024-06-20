import { DubApiError } from "../errors";
import { Scope, scopeMapping } from "./scopes";

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

  const userScopes: Scope[] = scopes
    .map((scope) => scopeMapping[scope] || scope)
    .flat();

  const missingScopes = requiredScopes
    .filter((requiredScope) => !userScopes.includes(requiredScope))
    .join(", ");

  for (const requiredScope of requiredScopes) {
    if (!userScopes.includes(requiredScope)) {
      throw new DubApiError({
        code: "forbidden",
        message: `The provided key does not have the required permissions for this endpoint on the workspace 'w_${workspaceId}'. Having the '${missingScopes}' permission would allow this request to continue.`,
      });
    }
  }
};
