"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceEnvironment } from "@dub/prisma/client";
import { Cube } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";

export function StagingWorkspaceBanner() {
  const { workspaces } = useWorkspaces();
  const { id, environment } = useWorkspace();

  const isVisible = environment === WorkspaceEnvironment.staging;

  if (!isVisible) {
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
        "fixed left-0 right-0 z-50 flex items-center justify-between gap-4 overflow-hidden bg-amber-200 px-4 py-1.5 text-neutral-900",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Cube className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold text-neutral-800">
          Staging workspace
        </span>
      </div>

      <p className="hidden min-w-0 flex-1 text-center text-sm font-medium text-neutral-800 sm:block">
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
          className="bg-bg-inverted text-content-inverted shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium"
        >
          Exit staging
        </Link>
      ) : (
        <span className="w-[88px] shrink-0" />
      )}
    </motion.div>
  );
}
