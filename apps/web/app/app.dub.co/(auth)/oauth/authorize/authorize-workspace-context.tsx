"use client";

import { canInstallOAuthApp } from "@/lib/api/oauth/can-install-oauth-app";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { Integration } from "@prisma/client";
import { useSession } from "next-auth/react";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

type AuthorizeIntegration = Pick<
  Integration,
  "verified" | "projectId" | "userId"
>;

type AuthorizeWorkspaceContextValue = {
  selectedWorkspace: WorkspaceProps | null;
  setSelectedWorkspace: Dispatch<SetStateAction<WorkspaceProps | null>>;
  workspaces: WorkspaceProps[] | undefined;
  workspacesLoading: boolean;
};

const AuthorizeWorkspaceContext =
  createContext<AuthorizeWorkspaceContextValue | null>(null);

// Shares the selected workspace between the scopes list and the authorize form
// so missing-scope warnings update when the workspace changes.
export function AuthorizeWorkspaceProvider({
  children,
  integration,
}: {
  children: ReactNode;
  integration: AuthorizeIntegration;
}) {
  const { data: session } = useSession();
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<WorkspaceProps | null>(null);
  const { workspaces, loading: workspacesLoading } = useWorkspaces();

  const userId = session?.user?.id;
  const defaultSlug = session?.user?.["defaultWorkspace"] || null;

  const defaultWorkspace = useMemo(() => {
    if (!workspaces || !userId) {
      return null;
    }

    return getDefaultAuthorizeWorkspace({
      workspaces,
      defaultSlug,
      integration,
      userId,
    });
  }, [workspaces, defaultSlug, integration, userId]);

  return (
    <AuthorizeWorkspaceContext.Provider
      value={{
        selectedWorkspace: selectedWorkspace ?? defaultWorkspace,
        setSelectedWorkspace,
        workspaces,
        workspacesLoading,
      }}
    >
      {children}
    </AuthorizeWorkspaceContext.Provider>
  );
}

export function useAuthorizeWorkspace() {
  const context = useContext(AuthorizeWorkspaceContext);

  if (!context) {
    throw new Error(
      "useAuthorizeWorkspace must be used within AuthorizeWorkspaceProvider",
    );
  }

  return context;
}

function getDefaultAuthorizeWorkspace({
  workspaces,
  defaultSlug,
  integration,
  userId,
}: {
  workspaces: WorkspaceProps[];
  defaultSlug: string | null;
  integration: AuthorizeIntegration;
  userId: string;
}) {
  const defaultWorkspace = defaultSlug
    ? workspaces.find((workspace) => workspace.slug === defaultSlug)
    : undefined;

  if (
    defaultWorkspace &&
    canInstallOAuthApp({ integration, workspace: defaultWorkspace, userId })
  ) {
    return defaultWorkspace;
  }

  const firstAllowed = workspaces.find((workspace) =>
    canInstallOAuthApp({ integration, workspace, userId }),
  );

  return firstAllowed ?? defaultWorkspace ?? null;
}
