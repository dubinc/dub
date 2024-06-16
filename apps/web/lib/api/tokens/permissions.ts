import { DubApiError } from "../errors";
import { Scope } from "./scopes";

export const throwIfNoAccess = ({
  scopes,
  requiredAnyOf,
}: {
  scopes: Scope[];
  requiredAnyOf: Scope | Scope[];
}) => {
  const requiredScopes = Array.isArray(requiredAnyOf)
    ? requiredAnyOf
    : [requiredAnyOf];

  for (const requiredScope of requiredScopes) {
    if (scopes.includes(requiredScope)) {
      return;
    }
  }

  throw new DubApiError({
    code: "forbidden",
    message: `You do not have permission to make this action.`,
  });
};
