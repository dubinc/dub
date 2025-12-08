"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound, redirect } from "next/navigation";
import { ReactNode } from "react";

export default function WorkspaceAuth({ children }: { children: ReactNode }) {
  const { loading: workspaceLoading, error } = useWorkspace();
  const { workspaces, loading: workspacesLoading } = useWorkspaces();

  if (workspaceLoading || workspacesLoading) {
    return <LayoutLoader />;
  }

  if (error && error.status === 404) {
    // If user has no workspaces, redirect to onboarding instead of showing 404
    // if (workspaces && workspaces.length === 0) {
    //   redirect("/onboarding/welcome");
    // }

    notFound();
  }

  return children;
}
