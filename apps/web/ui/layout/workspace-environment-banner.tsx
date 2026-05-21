"use client";

import { useDashboardBannerVisible } from "@/lib/hooks/use-dashboard-banner-visible";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceEnvironment } from "@dub/prisma/client";
import { IsolatedCube } from "@dub/ui";
import { cn } from "@dub/utils";
import { capitalize } from "@dub/utils/src";
import { motion } from "motion/react";
import Link from "next/link";

export function WorkspaceEnvironmentBanner() {
  const { id, environment } = useWorkspace();
  const { workspaces } = useWorkspaces();
  const { isEnvironmentBannerVisible } = useDashboardBannerVisible();

  if (!isEnvironmentBannerVisible) {
    return null;
  }

  const liveWorkspace = id
    ? workspaces?.find((workspace) => workspace.stagingWorkspaceId === id)
    : undefined;

  return (
    <motion.div
      initial={{ transform: "translateY(-100%)" }}
      animate={{ transform: "translateY(0)" }}
      className={cn(
        "fixed left-0 right-0 top-0 z-30 flex h-12 items-center justify-between gap-4 overflow-hidden px-6 text-neutral-800",
        environment === WorkspaceEnvironment.staging
          ? "bg-amber-200"
          : "bg-blue-200",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <IsolatedCube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          {capitalize(environment)} workspace
        </span>
      </div>

      <p className="hidden min-w-0 flex-1 text-center text-sm font-medium sm:block">
        No real money or payouts in staging.{" "}
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
          href={`/${liveWorkspace.slug}`}
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
