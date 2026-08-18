"use client";

import {
  canInstallOAuthApp,
  UNVERIFIED_APP_INSTALL_MESSAGE,
} from "@/lib/api/oauth/can-install-oauth-app";
import { consolidateScopes, getScopesForRole } from "@/lib/api/tokens/scopes";
import { useSession } from "@/lib/better-auth/use-session";
import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { WorkspaceSelector } from "@/ui/workspaces/workspace-selector";
import { Button } from "@dub/ui";
import { Integration } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as z from "zod/v4";

interface AuthorizeFormProps extends z.infer<typeof authorizeRequestSchema> {
  integration: Pick<Integration, "verified" | "projectId" | "userId">;
}

export const AuthorizeForm = ({
  client_id,
  redirect_uri,
  response_type,
  state,
  scope,
  code_challenge,
  code_challenge_method,
  integration,
}: AuthorizeFormProps) => {
  const { data: session } = useSession();
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );

  const userId = session?.user?.id;

  const isWorkspaceAllowed = useCallback(
    (workspace: WorkspaceProps) => {
      if (!userId) {
        return false;
      }

      return canInstallOAuthApp({
        integration,
        workspace,
        userId,
      });
    },
    [integration, userId],
  );

  useEffect(() => {
    if (!workspaces || workspacesLoading || !userId || selectedWorkspace) {
      return;
    }

    const defaultSlug = session?.user?.["defaultWorkspace"] || null;
    const defaultWorkspace = defaultSlug
      ? workspaces.find((workspace) => workspace.slug === defaultSlug)
      : undefined;

    if (defaultWorkspace && isWorkspaceAllowed(defaultWorkspace)) {
      setSelectedWorkspace(defaultWorkspace.slug);
      return;
    }

    const firstAllowed = workspaces.find(isWorkspaceAllowed);
    setSelectedWorkspace(firstAllowed?.slug ?? defaultSlug);
  }, [
    workspaces,
    workspacesLoading,
    session,
    userId,
    selectedWorkspace,
    isWorkspaceAllowed,
  ]);

  const authorizeDisabledTooltip = useMemo((): string | undefined => {
    if (!selectedWorkspace) {
      return "Please select a workspace to continue";
    }

    if (workspacesLoading || workspaces === undefined) {
      return "Loading workspaces...";
    }

    const workspace = workspaces.find(
      (workspace) => workspace.slug === selectedWorkspace,
    );

    if (!workspace) {
      return "Please select a valid workspace";
    }

    if (!isWorkspaceAllowed(workspace)) {
      return UNVERIFIED_APP_INSTALL_MESSAGE;
    }

    const userRole = workspace.users[0].role;

    const permissionsError = clientAccessCheck({
      action: "integrations.write",
      role: userRole,
      customPermissionDescription: "install this integration",
    }).error;

    if (typeof permissionsError === "string") {
      return permissionsError;
    }

    const missingScopes = consolidateScopes(scope).filter(
      (scope) =>
        !getScopesForRole(userRole).includes(scope) && scope !== "user.read",
    );

    if (missingScopes.length > 0) {
      return "You don't have the permission to install this integration";
    }

    return undefined;
  }, [
    workspaces,
    workspacesLoading,
    selectedWorkspace,
    scope,
    isWorkspaceAllowed,
  ]);

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

    const workspaceId = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace,
    )?.id;

    if (!workspaceId) {
      toast.error("Please select a workspace to continue");
      return;
    }

    setSubmitting(true);

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
          disabledTooltip={authorizeDisabledTooltip}
        />
      </div>
    </form>
  );
};
