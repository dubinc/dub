"use client";

import { WorkspaceProps } from "@/lib/types";
import { IsolatedCube } from "@dub/ui/icons";
import { WorkspaceEnvironment } from "@prisma/client";
import Link from "next/link";
import { isStagingEnvironment } from "../workspace-guards";

const buttonClassName =
  "text-content-emphasis flex w-full items-center justify-center gap-x-2 rounded-lg border border-neutral-200 px-2 py-1 outline-none transition-all duration-75 hover:bg-neutral-100/50 focus-visible:ring-2 focus-visible:ring-black/50 active:bg-neutral-200/80";

export function WorkspaceEnvironmentSwitcher({
  href,
  onNavigate,
  workspaces,
  selectedWorkspace,
}: {
  href: (slug: string) => string;
  onNavigate: () => void;
  workspaces: WorkspaceProps[];
  selectedWorkspace: { slug?: string };
}) {
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.slug === selectedWorkspace.slug,
  );

  if (!currentWorkspace) {
    return null;
  }

  let targetWorkspace: WorkspaceProps | undefined;
  let label: string;

  // Exit staging
  if (isStagingEnvironment(currentWorkspace.environment)) {
    targetWorkspace = workspaces.find(
      (workspace) => workspace.stagingWorkspaceId === currentWorkspace.id,
    );

    label = "Exit staging";
  }

  // Switch to staging
  else if (
    currentWorkspace.environment === WorkspaceEnvironment.production &&
    currentWorkspace.stagingWorkspaceId
  ) {
    targetWorkspace = workspaces.find(
      (workspace) => workspace.id === currentWorkspace.stagingWorkspaceId,
    );

    label = "Switch to staging";
  }

  // No action needed
  else {
    return null;
  }

  if (!targetWorkspace) {
    return null;
  }

  return (
    <Link
      href={href(targetWorkspace.slug)}
      shallow={false}
      className={buttonClassName}
      onClick={onNavigate}
    >
      <IsolatedCube className="text-content-emphasis size-4" />
      <span className="block truncate text-sm">{label}</span>
    </Link>
  );
}
