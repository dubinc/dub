"use client";

import { permissions } from "@/lib/api/tokens/scopes";
import { Check } from "lucide-react";

interface ScopesProps {
  scopes: string | null; // space separated scopes
}

export const ScopesRequested = (props: ScopesProps) => {
  const { scopes } = props;
  const scopesArray = scopes?.split(" ") ?? [];

  const requestedScopes = permissions.filter((p) =>
    scopesArray.includes(p.scope),
  );

  return (
    <>
      <span className="text-gray-600">Grant permissions:</span>
      <ul className="text-md space-y-1">
        {requestedScopes.map((requestedScope) => {
          return (
            <li
              className="flex items-center gap-2 text-gray-600"
              key={requestedScope.scope}
            >
              <Check className="h-4 w-4 text-green-500" />
              {requestedScope.description}
            </li>
          );
        })}
      </ul>
    </>
  );
};
