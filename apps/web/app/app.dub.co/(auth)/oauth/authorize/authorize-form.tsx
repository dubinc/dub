"use client";

import {
  canInstallOAuthApp,
  UNVERIFIED_APP_INSTALL_MESSAGE,
} from "@/lib/api/oauth/can-install-oauth-app";
import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { WorkspaceSelector } from "@/ui/workspaces/workspace-selector";
import { Button } from "@dub/ui";
import { Integration } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as z from "zod/v4";
import { useAuthorizeWorkspace } from "./authorize-workspace-context";

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
  const { selectedWorkspace, setSelectedWorkspace } = useAuthorizeWorkspace();

  const userId = session?.user?.id;

  useEffect(() => {
    if (!workspaces || workspacesLoading || !userId || selectedWorkspace) {
      return;
    }

    const defaultSlug = session?.user?.["defaultWorkspace"] || null;
    const defaultWorkspace = defaultSlug
      ? workspaces.find((workspace) => workspace.slug === defaultSlug)
      : undefined;

    if (
      defaultWorkspace &&
      canInstallOAuthApp({ integration, workspace: defaultWorkspace, userId })
    ) {
      setSelectedWorkspace(defaultWorkspace.slug);
      return;
    }

    const firstAllowed = workspaces.find((workspace) =>
      canInstallOAuthApp({ integration, workspace, userId }),
    );
    setSelectedWorkspace(firstAllowed?.slug ?? defaultSlug);
  }, [
    workspaces,
    workspacesLoading,
    session,
    userId,
    selectedWorkspace,
    integration,
    setSelectedWorkspace,
  ]);

  const authorizeDisabledTooltip = getAuthorizeError({
    selectedWorkspace,
    workspaces,
    workspacesLoading,
    integration,
    userId,
  });

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

const getAuthorizeError = ({
  selectedWorkspace,
  workspaces,
  workspacesLoading,
  integration,
  userId,
}: {
  selectedWorkspace: string | null;
  workspaces: WorkspaceProps[] | undefined;
  workspacesLoading: boolean;
  integration: AuthorizeFormProps["integration"];
  userId: string | undefined;
}) => {
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

  if (
    !userId ||
    !canInstallOAuthApp({
      integration,
      workspace,
      userId,
    })
  ) {
    return UNVERIFIED_APP_INSTALL_MESSAGE;
  }

  const { error: permissionsError } = clientAccessCheck({
    action: "integrations.write",
    role: workspace.users[0].role,
    customPermissionDescription: "install this integration",
  });

  if (typeof permissionsError === "string") {
    return permissionsError;
  }

  return undefined;
};
