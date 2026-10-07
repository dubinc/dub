import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { prisma } from "@/lib/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { DubApiError } from "../errors";

// Workspace clicks usage overage checks
export const throwIfClicksUsageExceeded = (workspace: WorkspaceWithUsers) => {
  if (workspace.usage > workspace.usageLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        planPeriod: workspace.planPeriod,
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
    workspace.plan !== "enterprise" //  don't throw an error for enterprise plans
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        planPeriod: workspace.planPeriod,
        limit: workspace.linksLimit,
        type: "links",
      }),
    });
  }
};

export const throwIfAIUsageExceeded = (workspace: WorkspaceWithUsers) => {
  if (workspace.aiUsage >= workspace.aiLimit) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        planPeriod: workspace.planPeriod,
        limit: workspace.aiLimit,
        type: "AI",
      }),
    });
  }
};

export async function reserveAIUsageCredit(
  workspace: Pick<WorkspaceWithUsers, "id" | "aiLimit" | "plan" | "planPeriod">,
) {
  const workspaceId = normalizeWorkspaceId(workspace.id);

  const count = await prisma.$executeRaw`
    UPDATE Project
    SET aiUsage = aiUsage + 1
    WHERE id = ${workspaceId}
      AND aiUsage < aiLimit
  `;

  if (count === 0) {
    throw new DubApiError({
      code: "forbidden",
      message: exceededLimitError({
        plan: workspace.plan,
        planPeriod: workspace.planPeriod,
        limit: workspace.aiLimit,
        type: "AI",
      }),
    });
  }
}

export async function refundAIUsageCredit(workspaceId: string) {
  await prisma.project.updateMany({
    where: {
      id: normalizeWorkspaceId(workspaceId),
      aiUsage: {
        gt: 0,
      },
    },
    data: {
      aiUsage: {
        decrement: 1,
      },
    },
  });
}
