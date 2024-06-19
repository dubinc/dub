import { DubApiError } from "../errors";
import { Scope } from "./scopes";

// Check if the required scope is in the list of scopes
// If not, throw an error immediately with a message
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

  console.log("Checking scopes", scopes, requiredScopes);

  for (const requiredScope of requiredScopes) {
    if (scopes.includes(requiredScope)) {
      return;
    }
  }

  const missingScopes = requiredScopes
    .filter((requiredScope) => !scopes.includes(requiredScope))
    .join(", ");

  throw new DubApiError({
    code: "forbidden",
    message: `The provided key does not have the required permissions for this endpoint on the workspace 'w_${workspaceId}'. Having the '${missingScopes}' permission would allow this request to continue.`,
  });
};
