"use client";

import { useDashboardBannerVisible } from "@/lib/hooks/use-dashboard-banner-visible";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { IsolatedCube } from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { WorkspaceEnvironment } from "@prisma/client";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isProductionEnvironment,
  isStagingEnvironment,
} from "../workspace-guards";

const buttonClassName =
  "text-content-emphasis flex w-full items-center justify-center gap-x-2 rounded-lg border border-neutral-200 px-2 py-1 outline-none transition-all duration-75 hover:bg-neutral-100/50 focus-visible:ring-2 focus-visible:ring-black/50 active:bg-neutral-200/80";

export function ProgramEnvironmentBanner({
  environment,
}: {
  environment: WorkspaceEnvironment;
}) {
  if (isProductionEnvironment(environment)) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between gap-4 overflow-hidden px-6 text-neutral-800",
        isStagingEnvironment(environment) ? "bg-amber-200" : "bg-blue-200",
      )}
    >
      <div className="flex shrink-0 items-center gap-2">
        <IsolatedCube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          {capitalize(environment)}
        </span>
      </div>

      <p className="text-sm font-medium">
        No real money or payouts in {environment}
      </p>
    </div>
  );
}

export function WorkspaceEnvironmentBanner() {
  const pathname = usePathname();
  const { loading: loadingWorkspace, ...currentWorkspace } = useWorkspace();
  const { workspaces, loading: loadingWorkspaces } = useWorkspaces();
  const { isEnvironmentBannerVisible } = useDashboardBannerVisible();

  if (
    !isEnvironmentBannerVisible ||
    isProductionEnvironment(currentWorkspace.environment) ||
    loadingWorkspace ||
    loadingWorkspaces ||
    !currentWorkspace.slug
  ) {
    return null;
  }

  const liveWorkspace = currentWorkspace.id
    ? workspaces?.find(
        (workspace) => workspace.stagingWorkspaceId === currentWorkspace.id,
      )
    : undefined;

  return (
    <motion.div
      initial={{ transform: "translateY(-100%)" }}
      animate={{ transform: "translateY(0)" }}
      className={cn(
        "fixed left-0 right-0 top-0 z-30 flex h-12 items-center justify-between gap-4 overflow-hidden px-6 text-neutral-800",
        isStagingEnvironment(currentWorkspace.environment)
          ? "bg-amber-200"
          : "bg-blue-200",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <IsolatedCube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          {capitalize(currentWorkspace.environment)} workspace
        </span>
      </div>

      <p className="hidden min-w-0 flex-1 text-center text-sm font-medium sm:block">
        No real money or payouts in {currentWorkspace.environment}.{" "}
        <a
          href="https://dub.co/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Learn more
        </a>
      </p>

      {liveWorkspace ? (
        <Link
          href={pathname.replace(currentWorkspace.slug, liveWorkspace.slug)}
          className="bg-bg-inverted text-content-inverted shrink-0 rounded-md p-2 text-xs font-medium"
        >
          Exit staging
        </Link>
      ) : (
        <span className="w-[88px] shrink-0" />
      )}
    </motion.div>
  );
}

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
    isProductionEnvironment(currentWorkspace.environment) &&
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
