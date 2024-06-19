import { DubApiError } from "../errors";
import { Scope } from "./scopes";

// Check if the required scope is in the list of scopes
// If not, throw an error immediately with a message
export const throwIfNoAccess = ({
  scopes,
  requiredScopes,
}: {
  scopes: Scope[];
  requiredScopes: Scope[];
}) => {
  if (requiredScopes.length === 0) {
    return;
  }

  for (const requiredScope of requiredScopes) {
    if (!scopes.includes(requiredScope)) {
      throw new DubApiError({
        code: "forbidden",
        message: `You do not have permission to make this action.`,
      });
    }
  }
};
