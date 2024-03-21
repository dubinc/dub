"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import NoWorkspacesPlaceholder from "@/ui/workspaces/no-workspaces-placeholder";
import WorkspaceCard from "@/ui/workspaces/workspace-card";
import WorkspaceCardPlaceholder from "./workspace-card-placeholder";

export default function WorkspaceList() {
  const { workspaces, loading } = useWorkspaces();

  if (loading) {
    return Array.from({ length: 6 }).map((_, i) => (
      <WorkspaceCardPlaceholder key={i} />
    ));
  }

  if (!workspaces || workspaces.length === 0) {
    return <NoWorkspacesPlaceholder />;
  }

  return workspaces.map((d) => <WorkspaceCard key={d.slug} {...d} />);
}
