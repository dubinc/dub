import { WorkspaceWithUsers } from "@/lib/types";
import { DubApiError, exceededLimitError } from "../errors";

// Workspace clicks usage overage checks
export const throwIfClicksUsageExceeded = (workspace: WorkspaceWithUsers) => {
  if (workspace.usage > workspace.usageLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        limit: workspace.usageLimit,
        type: "clicks",
      }),
    });
  }
};

// Workspace links usage overage checks
export const throwIfLinksUsageExceeded = (workspace: WorkspaceWithUsers) => {
  if (
    workspace.linksUsage >= workspace.linksLimit &&
    (workspace.plan === "free" || workspace.plan === "pro")
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        limit: workspace.linksLimit,
        type: "links",
      }),
    });
  }
};
