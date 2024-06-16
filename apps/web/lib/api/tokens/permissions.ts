import { DubApiError } from "../errors";
import { Scope } from "./scopes";

export const throwIfNotAllowed = ({
  scopes,
  requiredScope,
}: {
  scopes: Scope[];
  requiredScope: Scope;
}) => {
  if (!scopes.includes(requiredScope)) {
    throw new DubApiError({
      code: "forbidden",
      message: `You do not have permission to make this action. API key must have the "${requiredScope}" scope.`,
    });
  }
};
