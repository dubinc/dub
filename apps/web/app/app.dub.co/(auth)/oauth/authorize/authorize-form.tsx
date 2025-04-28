"use client";

import { consolidateScopes, getScopesForRole } from "@/lib/api/tokens/scopes";
import useWorkspaces from "@/lib/swr/use-workspaces";
import z from "@/lib/zod";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { WorkspaceSelector } from "@/ui/workspaces/workspace-selector";
import { Button } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AuthorizeFormProps extends z.infer<typeof authorizeRequestSchema> {
  //
}

export const AuthorizeForm = ({
  client_id,
  redirect_uri,
  response_type,
  state,
  scope,
  code_challenge,
  code_challenge_method,
}: AuthorizeFormProps) => {
  const { data: session } = useSession();
  const { workspaces } = useWorkspaces();
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );

  // missing scopes for the user's role on the workspace selected
  const [missingScopes, setMissingScopes] = useState<string[]>([]);

  useEffect(() => {
    setSelectedWorkspace(session?.user?.["defaultWorkspace"] || null);
  }, [session]);

  // Check if the user has the required scopes for the workspace selected
  useEffect(() => {
    if (!selectedWorkspace) {
      return;
    }

    const workspace = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace,
    );

    if (!workspace) {
      return;
    }

    const userRole = workspace.users[0].role;
    const scopesForRole = getScopesForRole(userRole);
    const scopesMissing = consolidateScopes(scope).filter(
      (scope) => !scopesForRole.includes(scope) && scope !== "user.read",
    );

    setMissingScopes(scopesMissing);
  }, [selectedWorkspace]);

  // Decline the request
  const onDecline = () => {
    const searchParams = new URLSearchParams({
      error: "access_denied",
      ...(state && { state }),
    });

    window.location.href = `${redirect_uri}?${searchParams.toString()}`;
  };

  // Approve the
  const onAuthorize = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedWorkspace) {
      toast.error("Please select a workspace to continue");
      return;
    }

    setSubmitting(true);

    const workspaceId = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace,
    )?.id;

    const response = await fetch(
      `/api/oauth/authorize?workspaceId=${workspaceId}`,
      {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      toast.error(data.error.message);
      return;
    }

    window.location.href = data.callbackUrl;
  };

  return (
    <form onSubmit={onAuthorize}>
      <input type="hidden" name="client_id" value={client_id} />
      <input type="hidden" name="redirect_uri" value={redirect_uri} />
      <input type="hidden" name="response_type" value={response_type} />
      <input type="hidden" name="scope" value={scope.join(",")} />
      {state && <input type="hidden" name="state" value={state} />}
      {code_challenge && (
        <input type="hidden" name="code_challenge" value={code_challenge} />
      )}
      {code_challenge_method && (
        <input
          type="hidden"
          name="code_challenge_method"
          value={code_challenge_method}
        />
      )}
      <p className="text-sm text-neutral-500">
        Select a workspace to grant API access to
      </p>
      <div className="max-w-md py-2">
        <WorkspaceSelector
          selectedWorkspace={selectedWorkspace || ""}
          setSelectedWorkspace={setSelectedWorkspace}
        />
      </div>
      <div className="mt-4 flex justify-between gap-4">
        <Button
          text="Decline"
          type="button"
          onClick={onDecline}
          variant="secondary"
          disabled={submitting}
        />
        <Button
          text="Authorize"
          type="submit"
          loading={submitting}
          disabled={!selectedWorkspace}
          disabledTooltip={
            !selectedWorkspace
              ? "Please select a workspace to continue"
              : missingScopes.length > 0
                ? "You don't have the permission to install this integration"
                : undefined
          }
        />
      </div>
    </form>
  );
};
