import { deleteWorkspaceFolders } from "@/lib/api/folders/delete-workspace-folders";
import { tokenCache } from "@/lib/auth/token-cache";
import { syncUserPlanToPlain } from "@/lib/plain/sync-user-plan";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { WorkspaceProps } from "@/lib/types";
import { webhookCache } from "@/lib/webhook/cache";
import { prisma } from "@dub/prisma";
import { getPlanAndTierFromPriceId } from "@dub/utils";
import { NEW_BUSINESS_PRICE_IDS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";

export async function updateWorkspacePlan({
  workspace,
  priceId,
}: {
  workspace: Pick<
    WorkspaceProps,
    | "id"
    | "planTier"
    | "paymentFailedAt"
    | "payoutsLimit"
    | "foldersUsage"
    | "defaultProgramId"
  > & {
    plan: string;
    restrictedTokens: {
      hashedKey: string;
    }[];
  };
  priceId: string;
}) {
  const { plan: newPlan, planTier: newPlanTier } = getPlanAndTierFromPriceId({
    priceId,
  });
  if (!newPlan) return;

  const newPlanName = newPlan.name.toLowerCase();
  const shouldDisableWebhooks = newPlanName === "free" || newPlanName === "pro";
  const shouldDeleteFolders =
    newPlanName === "free" && workspace.foldersUsage > 0;

  // If a workspace upgrades/downgrades their subscription
  // or if the payouts limit increases and the updated price ID is a new business price ID
  // update their usage limit in the database
  if (
    workspace.plan !== newPlanName ||
    workspace.planTier !== newPlanTier ||
    (workspace.payoutsLimit < newPlan.limits.payouts &&
      NEW_BUSINESS_PRICE_IDS.includes(priceId))
  ) {
    const [updatedWorkspace] = await Promise.allSettled([
      prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          plan: newPlanName,
          planTier: newPlanTier,
          usageLimit: newPlan.limits.clicks,
          linksLimit: newPlan.limits.links,
          payoutsLimit: newPlan.limits.payouts,
          domainsLimit: newPlan.limits.domains,
          aiLimit: newPlan.limits.ai,
          tagsLimit: newPlan.limits.tags,
          foldersLimit: newPlan.limits.folders,
          groupsLimit: newPlan.limits.groups,
          networkInvitesLimit: newPlan.limits.networkInvites,
          usersLimit: newPlan.limits.users,
          paymentFailedAt: null,
          ...(shouldDeleteFolders && { foldersUsage: 0 }),
        },
        include: {
          users: {
            where: {
              role: "owner",
            },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
      }),

      // expire tokens cache
      tokenCache.expireMany({
        hashedKeys: workspace.restrictedTokens.map(
          ({ hashedKey }) => hashedKey,
        ),
      }),

      // disable/enable program messaging if workspace has a program
      ...(workspace.defaultProgramId
        ? [
            prisma.program.update({
              where: {
                id: workspace.defaultProgramId,
              },
              data: {
                messagingEnabledAt: getPlanCapabilities(newPlanName)
                  .canMessagePartners
                  ? new Date()
                  : null,
              },
            }),
          ]
        : []),
    ]);

    // Disable the webhooks if the new plan does not support webhooks
    if (shouldDisableWebhooks) {
      await Promise.all([
        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            webhookEnabled: false,
          },
        }),

        prisma.webhook.updateMany({
          where: {
            projectId: workspace.id,
          },
          data: {
            disabledAt: new Date(),
          },
        }),
      ]);

      // Update the webhooks cache
      const webhooks = await prisma.webhook.findMany({
        where: {
          projectId: workspace.id,
        },
        select: {
          id: true,
          url: true,
          secret: true,
          triggers: true,
          disabledAt: true,
        },
      });

      await webhookCache.mset(webhooks);
    }

    // Delete the folders if the new plan is free
    // For downgrade from Business → Pro, it should be fine since we're accounting that to make sure all folders get write access.
    if (shouldDeleteFolders) {
      await deleteWorkspaceFolders({
        workspaceId: workspace.id,
      });
    }

    if (
      updatedWorkspace.status === "fulfilled" &&
      updatedWorkspace.value.users.length
    ) {
      const workspaceOwner = updatedWorkspace.value.users[0].user;
      waitUntil(syncUserPlanToPlain(workspaceOwner));
    }
  } else if (workspace.paymentFailedAt) {
    await prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        paymentFailedAt: null,
      },
    });
  }
}
