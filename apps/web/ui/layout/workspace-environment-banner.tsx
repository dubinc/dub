"use client";

import { useDashboardBannerVisible } from "@/lib/hooks/use-dashboard-banner-visible";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { Cube } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";

export function WorkspaceEnvironmentBanner() {
  const { id } = useWorkspace();
  const { workspaces } = useWorkspaces();
  const { isStagingBannerVisible } = useDashboardBannerVisible();

  if (!isStagingBannerVisible) {
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
        "fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 overflow-hidden bg-amber-200 px-4 py-1.5 text-neutral-800",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Cube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">
          Staging workspace
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
