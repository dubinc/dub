"use client";

import { OAUTH_SCOPE_DESCRIPTIONS } from "@/lib/api/oauth/constants";
import {
  consolidateScopes,
  getMissingScopesForRole,
} from "@/lib/api/tokens/scopes";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { Tooltip } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Check } from "lucide-react";
import { useAuthorizeWorkspace } from "./authorize-workspace-context";

export const ScopesRequested = ({ scopes }: { scopes: string[] }) => {
  const { workspaces } = useWorkspaces();
  const { selectedWorkspace } = useAuthorizeWorkspace();

  // Add default scopes if not present
  const requestedScopes = scopes.includes("user.read")
    ? scopes
    : [...scopes, "user.read"];

  const workspace = workspaces?.find(
    (workspace) => workspace.slug === selectedWorkspace,
  );

  const workspaceRole = workspace?.users[0]?.role;

  const missingScopes = workspaceRole
    ? getMissingScopesForRole({
        scopes: requestedScopes,
        role: workspaceRole,
      })
    : [];

  const missingScopeSet = new Set(missingScopes);

  const scopeWithDescriptions = consolidateScopes(requestedScopes).map(
    (scope) => {
      return {
        scope,
        description: OAUTH_SCOPE_DESCRIPTIONS[scope],
        missing: missingScopeSet.has(scope),
      };
    },
  );

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
      <span className="text-neutral-600">Grant permissions:</span>
      <ul className="text-md space-y-1">
        {scopeWithDescriptions.map((scope) => {
          return (
            <li className="flex items-center gap-2" key={scope.scope}>
              {scope.missing ? (
                <MissingScopeWarning />
              ) : (
                <Check className="size-4 shrink-0 text-green-500" />
              )}
              <div
                className={cn(scope.missing && "text-neutral-500")}
                dangerouslySetInnerHTML={{ __html: scope.description }}
              />
            </li>
          );
        })}
      </ul>
    </>
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
