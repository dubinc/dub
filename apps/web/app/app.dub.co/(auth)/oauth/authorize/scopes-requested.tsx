"use client";

import { OAUTH_SCOPE_DESCRIPTIONS } from "@/lib/api/oauth/constants";
import { getDisplayedScopesForRole } from "@/lib/api/tokens/scopes";
import { Tooltip } from "@dub/ui";
import { LoadingSpinner, TriangleWarning } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Check } from "lucide-react";
import { useAuthorizeWorkspace } from "./authorize-workspace-context";

export const ScopesRequested = ({ scopes }: { scopes: string[] }) => {
  const { selectedWorkspace } = useAuthorizeWorkspace();

  // Add default scopes if not present
  const requestedScopes = scopes.includes("user.read")
    ? scopes
    : [...scopes, "user.read"];

  if (!selectedWorkspace) {
    return <ScopesRequestedPlaceholder />;
  }

  const displayedScopes = getDisplayedScopesForRole({
    scopes: requestedScopes,
    role: selectedWorkspace.users[0].role,
  });

  return (
    <>
      <span className="text-neutral-600">Grant permissions:</span>
      <ul className="text-md space-y-1">
        {displayedScopes.map((scope) => {
          const catalog = OAUTH_SCOPE_DESCRIPTIONS[scope.scope];
          // Denied write rows: "Write access to …" (not "Read and Write …")
          // so granted read can sit beside them without sounding like write still includes read.
          const description =
            scope.missing && catalog.startsWith("Read and Write")
              ? catalog.replace("Read and Write", "Write")
              : catalog;

          return (
            <li className="flex items-center gap-2" key={scope.scope}>
              {scope.missing ? (
                <MissingScopeWarning />
              ) : (
                <Check className="size-4 shrink-0 text-green-500" />
              )}
              <ScopeDescription
                description={description}
                missing={scope.missing}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
};

const ScopesRequestedPlaceholder = () => {
  return (
    <>
      <span className="text-neutral-600">Grant permissions:</span>
      <div className="flex min-h-24 items-center justify-center">
        <LoadingSpinner className="size-4" />
      </div>
    </>
  );
};

const ScopeDescription = ({
  description,
  missing,
}: {
  description: string;
  missing: boolean;
}) => {
  const parts = description.split(/(Read|Write)/g);

  return (
    <div className={cn(missing && "text-neutral-500")}>
      {parts.map((part, index) =>
        part === "Read" || part === "Write" ? (
          <strong key={index}>{part}</strong>
        ) : (
          part
        ),
      )}
    </div>
  );
};

const MissingScopeWarning = () => {
  return (
    <Tooltip content="Your role in this workspace doesn't include this permission, so it won't be granted.">
      <span className="inline-flex shrink-0 cursor-help">
        <TriangleWarning className="size-4 text-amber-500" variant="fill" />
      </span>
    </Tooltip>
  );
};
