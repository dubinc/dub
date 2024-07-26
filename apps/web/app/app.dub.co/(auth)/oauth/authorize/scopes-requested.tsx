"use client";

import { OAUTH_SCOPE_DESCRIPTIONS } from "@/lib/api/oauth/constants";
import { Check } from "lucide-react";

interface ScopesProps {
  scopes: string[];
}

export const ScopesRequested = ({ scopes }: ScopesProps) => {
  // Add default scopes if not present
  if (!scopes.includes("user.read")) {
    scopes.push("user.read");
  }

  const scopeWithDescriptions = consolidateScopes(scopes).map((scope) => {
    return {
      scope,
      description: OAUTH_SCOPE_DESCRIPTIONS[scope],
    };
  });

  scopeWithDescriptions.forEach((scope) => {
    scope.description = scope.description.replace(
      "Write",
      "<strong className='font-medium'>Write</strong>",
    );

    scope.description = scope.description.replace(
      "Read",
      "<strong className='font-medium'>Read</strong>",
    );
  });

  return (
    <>
      <span className="text-gray-600">Grant permissions:</span>
      <ul className="text-md space-y-1">
        {scopeWithDescriptions.map((scope) => {
          return (
            <li className="flex items-center gap-2" key={scope.scope}>
              <Check className="h-4 w-4 text-green-500" />
              <div dangerouslySetInnerHTML={{ __html: scope.description }} />
            </li>
          );
        })}
      </ul>
    </>
  );
};

// Consolidate scopes to avoid duplication and show only the most permissive scope
const consolidateScopes = (scopes: string[]) => {
  const consolidated = new Set();

  scopes.forEach((scope) => {
    const [resource, action] = scope.split(".");

    if (action === "write") {
      consolidated.add(`${resource}.write`);
    } else if (action === "read" && !consolidated.has(`${resource}.write`)) {
      consolidated.add(`${resource}.read`);
    }
  });

  return Array.from(consolidated) as string[];
};
