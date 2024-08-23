import { getWorkspaceClicksLimit } from "@/lib/referrals";
import { WorkspaceWithUsers } from "@/lib/types";
import { DubApiError, exceededLimitError } from "../errors";

// Workspace clicks usage overage checks
export const throwIfClicksUsageExceeded = (workspace: WorkspaceWithUsers) => {
  const clicksLimit = getWorkspaceClicksLimit(workspace);

  if (workspace.usage > clicksLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        limit: clicksLimit,
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
